/**
 * LINE Message Handler
 * Handles regular message processing for LINE bot
 */

import { KnowledgeManagementSystem } from '@lufykms/core';
import { IncomingMessage, OutgoingMessage, FileUpload } from '../types';
import { LineApiClient } from './lineApiClient';

export class LineMessageHandler {
  private kms: KnowledgeManagementSystem;
  private apiClient: LineApiClient;
  private fileCache: Map<string, any>;
  private conversationCache: Map<string, any[]>;

  constructor(
    kms: KnowledgeManagementSystem,
    apiClient: LineApiClient,
    fileCache: Map<string, any>,
    conversationCache: Map<string, any[]>
  ) {
    this.kms = kms;
    this.apiClient = apiClient;
    this.fileCache = fileCache;
    this.conversationCache = conversationCache;
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    try {
      switch (message.type) {
        case 'text':
          return await this.handleTextMessage(message);
        
        case 'image':
        case 'video':
        case 'audio':
        case 'file':
          return await this.handleFileMessage(message);
        
        case 'sticker':
          return await this.handleStickerMessage(message);
        
        default:
          return [{
            type: 'text',
            content: `ขออภัย ฉันยังไม่สามารถจัดการกับข้อความประเภท ${message.type} ได้`
          }];
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return [{
        type: 'text',
        content: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผลข้อความ กรุณาลองใหม่อีกครั้ง'
      }];
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    const text = message.content.trim();
    
    // Check for special commands
    if (text.toLowerCase().includes('บันทึก') || text.toLowerCase().includes('save')) {
      return await this.handleSaveCommand(message);
    }

    // Check if user has cached file
    const cachedFile = this.fileCache.get(message.userId);
    if (cachedFile) {
      return await this.handleFileQuery(message, cachedFile);
    }

    // Search knowledge base
    return await this.handleKnowledgeQuery(message);
  }

  /**
   * Handle file messages (image, video, audio, file)
   */
  private async handleFileMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    try {
      // Download file content
      const fileBuffer = await this.apiClient.getMessageContent(message.id);
      
      // Cache file for user
      const fileData = {
        data: fileBuffer.toString('base64'),
        mimeType: this.getMimeTypeFromMessage(message),
        fileName: message.metadata?.fileName,
        timestamp: message.timestamp
      };
      
      this.fileCache.set(message.userId, fileData);

      // Return options for user
      return [{
        type: 'text',
        content: 'ได้รับไฟล์แล้ว! คุณต้องการทำอะไรกับไฟล์นี้?',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'message',
                label: '📚 บันทึกลงคลังความรู้',
                text: 'บันทึกลงคลังความรู้'
              }
            },
            {
              type: 'action',
              action: {
                type: 'message',
                label: '📝 สรุปเนื้อหา',
                text: 'สรุปเนื้อหาไฟล์นี้'
              }
            },
            {
              type: 'action',
              action: {
                type: 'message',
                label: '❓ ถามคำถาม',
                text: 'ถามคำถามเกี่ยวกับไฟล์'
              }
            }
          ]
        }
      }];
    } catch (error) {
      console.error('Error handling file message:', error);
      return [{
        type: 'text',
        content: 'ขออภัย ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง'
      }];
    }
  }

  /**
   * Handle sticker messages
   */
  private async handleStickerMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    const responses = [
      '😊 ขอบคุณสำหรับ sticker ค่ะ!',
      '🎉 sticker น่ารักมากเลย!',
      '😄 ได้รับ sticker แล้วค่ะ มีอะไรให้ช่วยไหม?',
      '🤗 sticker สวยจัง! ลองถามคำถามดูไหมคะ?',
      '✨ ขอบคุณค่ะ! พิมพ์คำถามมาได้เลยนะคะ'
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    // 30% chance to reply with sticker
    if (Math.random() < 0.3) {
      return [{
        type: 'sticker',
        data: {
          packageId: '446',
          stickerId: '1988'
        }
      }];
    }

    return [{
      type: 'text',
      content: randomResponse
    }];
  }

  /**
   * Handle save command
   */
  private async handleSaveCommand(message: IncomingMessage): Promise<OutgoingMessage[]> {
    const cachedFile = this.fileCache.get(message.userId);
    if (!cachedFile) {
      return [{
        type: 'text',
        content: 'กรุณาส่งไฟล์หรือข้อความที่ต้องการบันทึกลงคลังความรู้ก่อน'
      }];
    }

    try {
      // Show processing message
      await this.apiClient.showLoadingAnimation(message.userId);

      // Extract text from file and save to knowledge base
      // This would need Google AI integration for text extraction
      const extractedText = await this.extractTextFromFile(cachedFile);
      
      const docId = await this.kms.addDocument(extractedText, {
        fileName: cachedFile.fileName || 'Uploaded file',
        mimeType: cachedFile.mimeType,
        source: 'file_upload',
        userId: message.userId,
        timestamp: new Date().toISOString()
      });

      // Clear cached file
      this.fileCache.delete(message.userId);

      return [{
        type: 'text',
        content: `✅ บันทึกไฟล์ลงคลังความรู้เรียบร้อยแล้ว!\n\n` +
                 `📋 รหัสเอกสาร: ${docId.substring(0, 8)}...\n` +
                 `📊 ความยาว: ${extractedText.length} ตัวอักษร\n\n` +
                 `💡 ตอนนี้คุณสามารถถามคำถามเกี่ยวกับเอกสารนี้ได้แล้ว`
      }];
    } catch (error) {
      console.error('Error saving file:', error);
      return [{
        type: 'text',
        content: 'ขออภัย เกิดข้อผิดพลาดในการบันทึกไฟล์ กรุณาลองใหม่อีกครั้ง'
      }];
    }
  }

  /**
   * Handle file-based query
   */
  private async handleFileQuery(message: IncomingMessage, cachedFile: any): Promise<OutgoingMessage[]> {
    try {
      await this.apiClient.showLoadingAnimation(message.userId);

      // Add conversation context
      const conversationContext = this.buildConversationContext(message.userId);
      const queryWithContext = message.content + conversationContext;

      // This would need Google AI integration for file analysis
      const response = await this.analyzeFileWithQuery(cachedFile, queryWithContext);

      // Save to conversation history
      this.addToConversationHistory(message.userId, 'user', message.content);
      this.addToConversationHistory(message.userId, 'assistant', response);

      return [{
        type: 'text',
        content: response
      }];
    } catch (error) {
      console.error('Error handling file query:', error);
      return [{
        type: 'text',
        content: 'ขออภัย เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์ กรุณาลองใหม่อีกครั้ง'
      }];
    }
  }

  /**
   * Handle knowledge base query
   */
  private async handleKnowledgeQuery(message: IncomingMessage): Promise<OutgoingMessage[]> {
    try {
      await this.apiClient.showLoadingAnimation(message.userId);

      // Search knowledge base
      const searchResults = await this.kms.search(message.content, { limit: 3 });

      if (searchResults.length === 0) {
        return [{
          type: 'text',
          content: 'ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องในคลังความรู้ กรุณาส่งไฟล์หรือเอกสารมาก่อน'
        }];
      }

      // Generate response based on search results
      const context = searchResults.map(result => result.content).join('\n\n');
      const response = await this.generateResponseFromContext(message.content, context);

      // Save to conversation history
      this.addToConversationHistory(message.userId, 'user', message.content);
      this.addToConversationHistory(message.userId, 'assistant', response);

      return [{
        type: 'text',
        content: response
      }];
    } catch (error) {
      console.error('Error handling knowledge query:', error);
      return [{
        type: 'text',
        content: 'ขออภัย เกิดข้อผิดพลาดในการค้นหาข้อมูล กรุณาลองใหม่อีกครั้ง'
      }];
    }
  }

  /**
   * Handle postback (button/quick reply)
   */
  async handlePostback(userId: string, data: string, replyToken: string): Promise<OutgoingMessage[]> {
    try {
      // Check if it's a file ID for processing
      if (data.length > 20) {
        const fileBuffer = await this.apiClient.getMessageContent(data);
        
        // Cache file
        const fileData = {
          data: fileBuffer.toString('base64'),
          mimeType: 'application/octet-stream',
          timestamp: new Date().toISOString()
        };
        
        this.fileCache.set(userId, fileData);

        return [{
          type: 'text',
          content: 'ไฟล์พร้อมแล้ว! คุณต้องการทำอะไรกับไฟล์นี้?',
          quickReply: {
            items: [
              {
                type: 'action',
                action: {
                  type: 'message',
                  label: '📚 บันทึกลงคลังความรู้',
                  text: 'บันทึกลงคลังความรู้'
                }
              },
              {
                type: 'action',
                action: {
                  type: 'message',
                  label: '📝 สรุปเนื้อหา',
                  text: 'สรุปเนื้อหาไฟล์นี้'
                }
              }
            ]
          }
        }];
      }

      return [{
        type: 'text',
        content: 'ขออภัย ไม่เข้าใจคำสั่งนี้'
      }];
    } catch (error) {
      console.error('Error handling postback:', error);
      return [{
        type: 'text',
        content: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง'
      }];
    }
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(file: FileUpload): Promise<OutgoingMessage[]> {
    // Cache file for user
    const fileData = {
      data: file.data.toString('base64'),
      mimeType: file.mimeType,
      fileName: file.fileName,
      timestamp: file.timestamp
    };
    
    this.fileCache.set(file.userId, fileData);

    return [{
      type: 'text',
      content: `ได้รับไฟล์ "${file.fileName}" แล้ว! คุณต้องการทำอะไรกับไฟล์นี้?`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📚 บันทึกลงคลังความรู้',
              text: 'บันทึกลงคลังความรู้'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📝 สรุปเนื้อหา',
              text: 'สรุปเนื้อหาไฟล์นี้'
            }
          }
        ]
      }
    }];
  }

  /**
   * Build conversation context
   */
  private buildConversationContext(userId: string): string {
    const history = this.conversationCache.get(userId) || [];
    
    if (history.length === 0) {
      return '';
    }

    const context = history.map(item => {
      const role = item.role === 'user' ? 'ผู้ใช้' : 'ฉัน';
      return `${role}: ${item.message}`;
    }).join('\n');

    return `\n\nบริบทการสนทนาก่อนหน้า:\n${context}\n\nกรุณาตอบคำถามโดยคำนึงถึงบริบทการสนทนาข้างต้น:`;
  }

  /**
   * Add to conversation history
   */
  private addToConversationHistory(userId: string, role: string, message: string): void {
    const history = this.conversationCache.get(userId) || [];
    
    history.push({
      role,
      message,
      timestamp: new Date().toISOString()
    });

    // Limit history to 10 messages (5 pairs)
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    this.conversationCache.set(userId, history);
  }

  /**
   * Get MIME type from message metadata
   */
  private getMimeTypeFromMessage(message: IncomingMessage): string {
    switch (message.type) {
      case 'image':
        return 'image/jpeg';
      case 'video':
        return 'video/mp4';
      case 'audio':
        return 'audio/wav';
      case 'file':
        return message.metadata?.mimeType || 'application/octet-stream';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Extract text from file (placeholder - would need AI integration)
   */
  private async extractTextFromFile(fileData: any): Promise<string> {
    // This would integrate with Google AI to extract text from files
    // For now, return placeholder
    return `[Extracted text from ${fileData.fileName || 'file'}]\n\nContent would be extracted using AI...`;
  }

  /**
   * Analyze file with query (placeholder - would need AI integration)
   */
  private async analyzeFileWithQuery(fileData: any, query: string): Promise<string> {
    // This would integrate with Google AI for file analysis
    // For now, return placeholder
    return `ขออภัย ฟีเจอร์การวิเคราะห์ไฟล์ยังไม่พร้อมใช้งาน กรุณาบันทึกไฟล์ลงคลังความรู้ก่อน แล้วจึงถามคำถาม`;
  }

  /**
   * Generate response from context (placeholder - would need AI integration)
   */
  private async generateResponseFromContext(query: string, context: string): Promise<string> {
    // This would integrate with Google AI for response generation
    // For now, return simple response
    return `พบข้อมูลที่เกี่ยวข้องในคลังความรู้:\n\n${context.substring(0, 500)}...`;
  }
}