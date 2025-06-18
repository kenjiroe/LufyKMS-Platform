/**
 * LINE Webhook Parser
 * Parses LINE webhook events into plugin format
 */

import { WebhookEvent, IncomingMessage } from '../types';

export class LineWebhookParser {
  /**
   * Parse webhook body into events
   */
  parseWebhook(body: any): WebhookEvent[] {
    if (!body || !body.events || !Array.isArray(body.events)) {
      return [];
    }

    return body.events.map(event => this.parseEvent(event)).filter(Boolean);
  }

  /**
   * Parse individual LINE event
   */
  private parseEvent(event: any): WebhookEvent | null {
    if (!event || !event.source || !event.timestamp) {
      return null;
    }

    return {
      type: event.type,
      source: {
        type: event.source.type,
        userId: event.source.userId,
        groupId: event.source.groupId,
        roomId: event.source.roomId
      },
      timestamp: new Date(event.timestamp).toISOString(),
      replyToken: event.replyToken,
      message: event.message,
      postback: event.postback,
      beacon: event.beacon,
      accountLink: event.accountLink,
      things: event.things
    };
  }

  /**
   * Parse message from webhook event
   */
  parseMessageFromEvent(event: WebhookEvent): IncomingMessage | null {
    if (event.type !== 'message' || !event.message || !event.source.userId) {
      return null;
    }

    const message = event.message;
    
    return {
      id: message.id,
      userId: event.source.userId,
      content: this.extractMessageContent(message),
      type: this.mapMessageType(message.type),
      timestamp: event.timestamp,
      platform: 'line',
      metadata: {
        lineEventType: event.type,
        lineMessageType: message.type,
        sourceType: event.source.type,
        groupId: event.source.groupId,
        roomId: event.source.roomId,
        fileName: message.fileName,
        fileSize: message.fileSize,
        duration: message.duration,
        title: message.title,
        address: message.address,
        latitude: message.latitude,
        longitude: message.longitude,
        packageId: message.packageId,
        stickerId: message.stickerId
      },
      replyToken: event.replyToken,
      groupId: event.source.groupId,
      roomId: event.source.roomId
    };
  }

  /**
   * Extract content from LINE message
   */
  private extractMessageContent(message: any): string {
    switch (message.type) {
      case 'text':
        return message.text || '';
      
      case 'image':
        return '[Image]';
      
      case 'video':
        return '[Video]';
      
      case 'audio':
        return '[Audio]';
      
      case 'file':
        return `[File: ${message.fileName || 'Unknown'}]`;
      
      case 'location':
        return `[Location: ${message.address || 'Unknown address'}]`;
      
      case 'sticker':
        return `[Sticker: ${message.packageId}/${message.stickerId}]`;
      
      default:
        return `[${message.type}]`;
    }
  }

  /**
   * Map LINE message types to plugin message types
   */
  private mapMessageType(lineType: string): 'text' | 'image' | 'audio' | 'video' | 'file' | 'sticker' | 'location' {
    switch (lineType) {
      case 'text':
        return 'text';
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'audio':
        return 'audio';
      case 'file':
        return 'file';
      case 'sticker':
        return 'sticker';
      case 'location':
        return 'location';
      default:
        return 'text'; // Fallback
    }
  }

  /**
   * Parse postback data
   */
  parsePostbackData(data: string): Record<string, any> {
    try {
      // Try to parse as JSON first
      return JSON.parse(data);
    } catch {
      // If not JSON, parse as query string
      const params = new URLSearchParams(data);
      const result: Record<string, any> = {};
      
      for (const [key, value] of params) {
        result[key] = value;
      }
      
      return result;
    }
  }

  /**
   * Create postback data string
   */
  createPostbackData(data: Record<string, any>): string {
    // Always use JSON for consistency
    return JSON.stringify(data);
  }

  /**
   * Validate LINE webhook format
   */
  validateWebhook(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body) {
      errors.push('Webhook body is missing');
      return { isValid: false, errors };
    }

    if (!body.events) {
      errors.push('Webhook events are missing');
    } else if (!Array.isArray(body.events)) {
      errors.push('Webhook events must be an array');
    }

    if (body.destination && typeof body.destination !== 'string') {
      errors.push('Webhook destination must be a string');
    }

    // Validate each event
    if (Array.isArray(body.events)) {
      body.events.forEach((event, index) => {
        const eventErrors = this.validateEvent(event, index);
        errors.push(...eventErrors);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual event
   */
  private validateEvent(event: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `Event ${index}:`;

    if (!event) {
      errors.push(`${prefix} Event is null or undefined`);
      return errors;
    }

    if (!event.type) {
      errors.push(`${prefix} Event type is missing`);
    }

    if (!event.source) {
      errors.push(`${prefix} Event source is missing`);
    } else {
      if (!event.source.type) {
        errors.push(`${prefix} Source type is missing`);
      }
      
      if (event.source.type === 'user' && !event.source.userId) {
        errors.push(`${prefix} User ID is missing for user source`);
      }
    }

    if (!event.timestamp) {
      errors.push(`${prefix} Timestamp is missing`);
    }

    // Validate message events
    if (event.type === 'message') {
      if (!event.message) {
        errors.push(`${prefix} Message data is missing`);
      } else {
        if (!event.message.type) {
          errors.push(`${prefix} Message type is missing`);
        }
        
        if (!event.message.id) {
          errors.push(`${prefix} Message ID is missing`);
        }
      }
      
      if (!event.replyToken) {
        errors.push(`${prefix} Reply token is missing for message event`);
      }
    }

    return errors;
  }

  /**
   * Extract user mentions from text
   */
  extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Check if message is from group or room
   */
  isGroupMessage(event: WebhookEvent): boolean {
    return event.source.type === 'group' || event.source.type === 'room';
  }

  /**
   * Get conversation context ID
   */
  getConversationId(event: WebhookEvent): string {
    switch (event.source.type) {
      case 'group':
        return `group:${event.source.groupId}`;
      case 'room':
        return `room:${event.source.roomId}`;
      case 'user':
      default:
        return `user:${event.source.userId}`;
    }
  }
}