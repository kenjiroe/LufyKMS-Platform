/**
 * LINE API Client
 * Handles all LINE API communications
 */

import { OutgoingMessage } from '../types';

export interface LineApiConfig {
  channelAccessToken: string;
  channelSecret: string;
}

export class LineApiClient {
  private config: LineApiConfig;
  private baseUrl = 'https://api.line.me/v2/bot';
  private isApiConnected: boolean = false;

  constructor(config: LineApiConfig) {
    this.config = config;
  }

  /**
   * Test LINE API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/info');
      this.isApiConnected = response.status === 200;
      return this.isApiConnected;
    } catch (error) {
      console.error('LINE API connection test failed:', error);
      this.isApiConnected = false;
      return false;
    }
  }

  /**
   * Check if API is connected
   */
  isConnected(): boolean {
    return this.isApiConnected;
  }

  /**
   * Reply to message
   */
  async replyMessage(replyToken: string, messages: OutgoingMessage[]): Promise<void> {
    const lineMessages = messages.map(msg => this.convertToLineMessage(msg));
    
    await this.makeRequest('POST', '/message/reply', {
      replyToken,
      messages: lineMessages
    });
  }

  /**
   * Push message to user
   */
  async pushMessage(userId: string, messages: OutgoingMessage[]): Promise<void> {
    const lineMessages = messages.map(msg => this.convertToLineMessage(msg));
    
    await this.makeRequest('POST', '/message/push', {
      to: userId,
      messages: lineMessages
    });
  }

  /**
   * Multicast message to multiple users
   */
  async multicastMessage(userIds: string[], messages: OutgoingMessage[]): Promise<void> {
    const lineMessages = messages.map(msg => this.convertToLineMessage(msg));
    
    await this.makeRequest('POST', '/message/multicast', {
      to: userIds,
      messages: lineMessages
    });
  }

  /**
   * Show loading indicator
   */
  async showLoadingAnimation(userId: string, loadingSeconds: number = 5): Promise<void> {
    await this.makeRequest('POST', '/chat/loading/start', {
      chatId: userId,
      loadingSeconds
    });
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<any> {
    const response = await this.makeRequest('GET', `/profile/${userId}`);
    return response.data;
  }

  /**
   * Get message content (for files)
   */
  async getMessageContent(messageId: string): Promise<Buffer> {
    const response = await this.makeRequest('GET', `/message/${messageId}/content`, null, {
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  }

  /**
   * Create rich menu
   */
  async createRichMenu(richMenu: any): Promise<{ richMenuId: string }> {
    const response = await this.makeRequest('POST', '/richmenu', richMenu);
    return response.data;
  }

  /**
   * Upload rich menu image
   */
  async uploadRichMenuImage(richMenuId: string, imageBuffer: Buffer): Promise<void> {
    await this.makeRequest('POST', `/richmenu/${richMenuId}/content`, imageBuffer, {
      headers: {
        'Content-Type': 'image/png'
      }
    });
  }

  /**
   * Set default rich menu
   */
  async setDefaultRichMenu(richMenuId: string): Promise<void> {
    await this.makeRequest('POST', `/user/all/richmenu/${richMenuId}`);
  }

  /**
   * Delete rich menu
   */
  async deleteRichMenu(richMenuId: string): Promise<void> {
    await this.makeRequest('DELETE', `/richmenu/${richMenuId}`);
  }

  /**
   * List rich menus
   */
  async listRichMenus(): Promise<{ richmenus: any[] }> {
    const response = await this.makeRequest('GET', '/richmenu/list');
    return response.data;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(body: any, signature: string): boolean {
    const crypto = require('crypto');
    const bodyString = JSON.stringify(body);
    const hash = crypto
      .createHmac('sha256', this.config.channelSecret)
      .update(bodyString)
      .digest('base64');
    
    return signature === hash;
  }

  /**
   * Convert plugin message to LINE message format
   */
  private convertToLineMessage(message: OutgoingMessage): any {
    switch (message.type) {
      case 'text':
        const textMessage: any = {
          type: 'text',
          text: message.content
        };
        
        if (message.quickReply) {
          textMessage.quickReply = message.quickReply;
        }
        
        return textMessage;

      case 'image':
        return {
          type: 'image',
          originalContentUrl: message.url,
          previewImageUrl: message.url
        };

      case 'audio':
        return {
          type: 'audio',
          originalContentUrl: message.url,
          duration: message.data?.duration || 1000
        };

      case 'video':
        return {
          type: 'video',
          originalContentUrl: message.url,
          previewImageUrl: message.data?.previewUrl || message.url
        };

      case 'file':
        return {
          type: 'file',
          originalContentUrl: message.url,
          fileName: message.data?.fileName || 'file'
        };

      case 'sticker':
        return {
          type: 'sticker',
          packageId: message.data?.packageId || '446',
          stickerId: message.data?.stickerId || '1988'
        };

      case 'template':
        return {
          type: 'template',
          altText: message.data?.altText || 'Template message',
          template: message.template
        };

      case 'flex':
        return {
          type: 'flex',
          altText: message.data?.altText || 'Flex message',
          contents: message.data?.contents
        };

      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }
  }

  /**
   * Make HTTP request to LINE API
   */
  private async makeRequest(
    method: string, 
    endpoint: string, 
    data?: any, 
    options: any = {}
  ): Promise<any> {
    const axios = require('axios');
    
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.config.channelAccessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (data !== null && data !== undefined) {
      if (Buffer.isBuffer(data)) {
        config.data = data;
      } else {
        config.data = data;
      }
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error: any) {
      console.error(`LINE API request failed:`, {
        method,
        endpoint,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<any> {
    const response = await this.makeRequest('GET', '/channel/webhook/endpoint');
    return response.data;
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(endpoint?: string): Promise<any> {
    const response = await this.makeRequest('POST', '/channel/webhook/test', {
      endpoint: endpoint || undefined
    });
    return response.data;
  }

  /**
   * Get bot info
   */
  async getBotInfo(): Promise<any> {
    const response = await this.makeRequest('GET', '/info');
    return response.data;
  }

  /**
   * Get quota information
   */
  async getQuota(): Promise<any> {
    const response = await this.makeRequest('GET', '/message/quota');
    return response.data;
  }

  /**
   * Get consumption information
   */
  async getConsumption(): Promise<any> {
    const response = await this.makeRequest('GET', '/message/quota/consumption');
    return response.data;
  }
}