/**
 * LINE Chatbot Plugin
 * Migrated from stou-kb repository
 */

import { BasePlugin } from '../base/basePlugin';
import { 
  PluginConfig, 
  PluginContext, 
  IncomingMessage, 
  OutgoingMessage,
  FileUpload,
  Command,
  MessagePlugin,
  WebhookEvent
} from '../types';
import { LineApiClient } from './lineApiClient';
import { LineMessageHandler } from './lineMessageHandler';
import { LineAdminHandler } from './lineAdminHandler';
import { LineRichMenuManager } from './lineRichMenuManager';
import { LineWebhookParser } from './lineWebhookParser';

export class LineChatbotPlugin extends BasePlugin implements MessagePlugin {
  private apiClient: LineApiClient;
  private messageHandler: LineMessageHandler;
  private adminHandler: LineAdminHandler;
  private richMenuManager: LineRichMenuManager;
  private webhookParser: LineWebhookParser;
  private fileCache: Map<string, any> = new Map();
  private conversationCache: Map<string, any[]> = new Map();

  constructor(config: PluginConfig) {
    super(config);
  }

  protected async onInit(context: PluginContext): Promise<void> {
    // Validate required settings
    this.validateSettings();

    // Initialize components
    this.apiClient = new LineApiClient({
      channelAccessToken: this.getSetting('channelAccessToken', ''),
      channelSecret: this.getSetting('channelSecret', '')
    });

    this.webhookParser = new LineWebhookParser();

    this.messageHandler = new LineMessageHandler(
      context.kms,
      this.apiClient,
      this.fileCache,
      this.conversationCache
    );

    this.adminHandler = new LineAdminHandler(
      context.kms,
      this.apiClient,
      this.getSetting('adminUsers', [])
    );

    this.richMenuManager = new LineRichMenuManager(this.apiClient);

    this.log.info('LINE Chatbot Plugin initialized');
  }

  protected async onStart(context: PluginContext): Promise<void> {
    // Test LINE API connection
    const isConnected = await this.apiClient.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to LINE API. Check your access token.');
    }

    // Setup Rich Menu if enabled
    if (this.getSetting('autoSetupRichMenu', true)) {
      try {
        await this.richMenuManager.setupDefaultRichMenu();
        this.log.info('Rich Menu setup completed');
      } catch (error) {
        this.log.warn('Rich Menu setup failed:', error);
      }
    }

    this.log.info('LINE Chatbot Plugin started and ready to receive messages');
  }

  protected async onStop(context: PluginContext): Promise<void> {
    // Clear caches
    this.fileCache.clear();
    this.conversationCache.clear();
    
    this.log.info('LINE Chatbot Plugin stopped');
  }

  /**
   * Handle incoming webhook from LINE
   */
  async handleWebhook(body: any, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.apiClient.verifySignature(body, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const events = this.webhookParser.parseWebhook(body);
      
      for (const event of events) {
        await this.processWebhookEvent(event);
      }
    } catch (error) {
      this.log.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Process individual webhook event
   */
  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      const userId = event.source.userId;
      if (!userId) {
        this.log.warn('Event has no user ID, skipping');
        return;
      }

      switch (event.type) {
        case 'message':
          await this.handleMessageEvent(event);
          break;
        
        case 'postback':
          await this.handlePostbackEvent(event);
          break;
        
        case 'follow':
          await this.handleFollowEvent(event);
          break;
        
        case 'unfollow':
          await this.handleUnfollowEvent(event);
          break;
        
        default:
          this.log.debug(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.log.error(`Error processing webhook event:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Handle message events
   */
  private async handleMessageEvent(event: WebhookEvent): Promise<void> {
    const message = this.webhookParser.parseMessageFromEvent(event);
    if (!message) return;

    // Check for admin commands
    if (message.type === 'text' && message.content.startsWith('/admin')) {
      const command = this.parseAdminCommand(message.content, message.userId);
      if (command) {
        const responses = await this.adminHandler.handleCommand(command, message.replyToken!);
        return; // Admin handler sends responses directly
      }
    }

    // Handle regular messages
    const responses = await this.messageHandler.handleMessage(message);
    
    if (responses.length > 0 && message.replyToken) {
      await this.apiClient.replyMessage(message.replyToken, responses);
    }
  }

  /**
   * Handle postback events
   */
  private async handlePostbackEvent(event: WebhookEvent): Promise<void> {
    if (!event.postback?.data || !event.replyToken) return;

    const responses = await this.messageHandler.handlePostback(
      event.source.userId!,
      event.postback.data,
      event.replyToken
    );

    if (responses.length > 0) {
      await this.apiClient.replyMessage(event.replyToken, responses);
    }
  }

  /**
   * Handle follow events (user adds bot as friend)
   */
  private async handleFollowEvent(event: WebhookEvent): Promise<void> {
    const userId = event.source.userId!;
    
    const welcomeMessage: OutgoingMessage = {
      type: 'text',
      content: `🤖 สวัสดีครับ! ยินดีต้อนรับสู่ระบบ LufyKMS\n\n` +
               `📚 ฉันสามารถช่วยคุณได้ในเรื่อง:\n` +
               `• ตอบคำถามจากคลังความรู้\n` +
               `• วิเคราะห์ไฟล์เอกสาร\n` +
               `• บันทึกข้อมูลลงคลังความรู้\n\n` +
               `💡 เริ่มต้นโดยส่งคำถามหรือไฟล์มาได้เลย!`
    };

    if (event.replyToken) {
      await this.apiClient.replyMessage(event.replyToken, [welcomeMessage]);
    } else {
      await this.apiClient.pushMessage(userId, [welcomeMessage]);
    }

    this.log.info(`New user followed: ${userId}`);
  }

  /**
   * Handle unfollow events (user removes bot)
   */
  private async handleUnfollowEvent(event: WebhookEvent): Promise<void> {
    const userId = event.source.userId!;
    
    // Clean up user data
    this.fileCache.delete(userId);
    this.conversationCache.delete(userId);
    
    this.log.info(`User unfollowed: ${userId}`);
  }

  /**
   * Parse admin command from text
   */
  private parseAdminCommand(text: string, userId: string): Command | null {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2 || parts[0] !== '/admin') {
      return null;
    }

    return {
      name: parts[1],
      userId,
      args: parts.slice(2),
      rawText: text,
      timestamp: new Date().toISOString(),
      platform: 'line',
      isAdmin: this.adminHandler.isAdmin(userId)
    };
  }

  /**
   * Plugin interface implementations
   */
  async handleMessage(message: IncomingMessage, context: PluginContext): Promise<OutgoingMessage[]> {
    if (message.platform !== 'line') {
      return [];
    }

    return await this.messageHandler.handleMessage(message);
  }

  async handleFileUpload(file: FileUpload, context: PluginContext): Promise<OutgoingMessage[]> {
    if (file.platform !== 'line') {
      return [];
    }

    return await this.messageHandler.handleFileUpload(file);
  }

  async handleCommand(command: Command, context: PluginContext): Promise<OutgoingMessage[]> {
    if (command.platform !== 'line' || !command.isAdmin) {
      return [];
    }

    return await this.adminHandler.handleCommand(command, command.replyToken);
  }

  /**
   * Get conversation history for user
   */
  getConversationHistory(userId: string): any[] {
    return this.conversationCache.get(userId) || [];
  }

  /**
   * Clear conversation history for user
   */
  clearConversationHistory(userId: string): void {
    this.conversationCache.delete(userId);
    this.log.info(`Cleared conversation history for user: ${userId}`);
  }

  /**
   * Get file cache for user
   */
  getUserFileCache(userId: string): any {
    return this.fileCache.get(userId);
  }

  /**
   * Clear file cache for user
   */
  clearUserFileCache(userId: string): void {
    this.fileCache.delete(userId);
    this.log.info(`Cleared file cache for user: ${userId}`);
  }

  /**
   * Get plugin status for admin
   */
  getStatus(): {
    name: string;
    version: string;
    isRunning: boolean;
    metrics: any;
    cacheStats: any;
    lineApiStatus: boolean;
  } {
    return {
      name: this.config.name,
      version: this.config.version,
      isRunning: this.isPluginRunning(),
      metrics: this.getMetrics(),
      cacheStats: {
        fileCacheSize: this.fileCache.size,
        conversationCacheSize: this.conversationCache.size
      },
      lineApiStatus: this.apiClient.isConnected()
    };
  }

  /**
   * Validate required plugin settings
   */
  private validateSettings(): void {
    const requiredSettings = ['channelAccessToken', 'channelSecret'];
    
    for (const setting of requiredSettings) {
      if (!this.getSetting(setting, '')) {
        throw new Error(`Required setting '${setting}' is missing`);
      }
    }
  }

  /**
   * Setup rich menu (admin function)
   */
  async setupRichMenu(): Promise<string> {
    return await this.richMenuManager.setupDefaultRichMenu();
  }

  /**
   * Clear all rich menus (admin function)
   */
  async clearRichMenus(): Promise<number> {
    return await this.richMenuManager.clearAllRichMenus();
  }

  /**
   * Test LINE API connection
   */
  async testConnection(): Promise<boolean> {
    return await this.apiClient.testConnection();
  }
}