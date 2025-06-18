/**
 * LINE Admin Handler
 * Handles admin commands for LINE bot
 */

import { KnowledgeManagementSystem } from '@lufykms/core';
import { Command, OutgoingMessage } from '../types';
import { LineApiClient } from './lineApiClient';

export class LineAdminHandler {
  private kms: KnowledgeManagementSystem;
  private apiClient: LineApiClient;
  private adminUsers: string[];

  constructor(
    kms: KnowledgeManagementSystem, 
    apiClient: LineApiClient, 
    adminUsers: string[] = []
  ) {
    this.kms = kms;
    this.apiClient = apiClient;
    this.adminUsers = adminUsers;
  }

  /**
   * Check if user is admin
   */
  isAdmin(userId: string): boolean {
    return this.adminUsers.includes(userId);
  }

  /**
   * Add admin user
   */
  addAdmin(userId: string): void {
    if (!this.adminUsers.includes(userId)) {
      this.adminUsers.push(userId);
    }
  }

  /**
   * Remove admin user
   */
  removeAdmin(userId: string): void {
    const index = this.adminUsers.indexOf(userId);
    if (index > -1) {
      this.adminUsers.splice(index, 1);
    }
  }

  /**
   * Handle admin command
   */
  async handleCommand(command: Command, replyToken?: string): Promise<OutgoingMessage[]> {
    if (!this.isAdmin(command.userId)) {
      return [{
        type: 'text',
        content: 'ขออภัย คุณไม่มีสิทธิ์ใช้คำสั่งนี้'
      }];
    }

    try {
      switch (command.name) {
        case 'status':
          return await this.handleStatusCommand();
        
        case 'docs':
          return await this.handleDocsCommand();
        
        case 'clear':
          return await this.handleClearCommand(command.args);
        
        case 'stats':
          return await this.handleStatsCommand();
        
        case 'help':
          return await this.handleHelpCommand();
        
        default:
          return [{
            type: 'text',
            content: `ไม่รู้จักคำสั่ง: ${command.name}\nใช้ /admin help เพื่อดูคำสั่งที่มี`
          }];
      }
    } catch (error) {
      console.error(`Error handling admin command ${command.name}:`, error);
      return [{
        type: 'text',
        content: `เกิดข้อผิดพลาดในการประมวลผลคำสั่ง: ${error.message}`
      }];
    }
  }

  /**
   * Handle status command
   */
  private async handleStatusCommand(): Promise<OutgoingMessage[]> {
    try {
      const health = await this.kms.getHealthStatus();
      const storageStats = await this.kms.getStorageStats();

      const message = [
        '📊 สถานะระบบ LufyKMS:',
        '',
        `🟢 Storage: ${health.storage ? 'ปกติ' : '❌ ผิดปกติ'}`,
        `🟢 Embedding: ${health.embedding ? 'ปกติ' : '❌ ผิดปกติ'}`,
        `🟢 Search: ${health.search ? 'ปกติ' : '❌ ผิดปกติ'}`,
        '',
        `📚 เอกสารทั้งหมด: ${health.totalDocuments} รายการ`,
        `💾 ขนาดข้อมูล: ${Math.round((storageStats?.totalSize || 0) / 1024)} KB`,
        '',
        `⏰ อัพเดทล่าสุด: ${new Date().toLocaleString('th-TH')}`
      ].join('\n');

      return [{ type: 'text', content: message }];
    } catch (error) {
      return [{
        type: 'text',
        content: `ไม่สามารถดึงสถานะระบบได้: ${error.message}`
      }];
    }
  }

  /**
   * Handle docs command
   */
  private async handleDocsCommand(): Promise<OutgoingMessage[]> {
    try {
      const documents = await this.kms.getAllDocuments();

      if (documents.length === 0) {
        return [{
          type: 'text',
          content: '📚 คลังความรู้ว่างเปล่า'
        }];
      }

      const message = [
        `📚 เอกสารในคลังความรู้ (${documents.length} เอกสาร):`,
        ''
      ];

      documents.slice(0, 10).forEach((doc, index) => {
        const preview = doc.content.substring(0, 50);
        message.push(`${index + 1}. ${doc.metadata.fileName || doc.id.substring(0, 8)}`);
        message.push(`   ${preview}...`);
        message.push(`   ขนาด: ${doc.content.length} ตัวอักษร`);
        message.push('');
      });

      if (documents.length > 10) {
        message.push(`... และอีก ${documents.length - 10} เอกสาร`);
      }

      return [{ type: 'text', content: message.join('\n') }];
    } catch (error) {
      return [{
        type: 'text',
        content: `ไม่สามารถดูรายการเอกสารได้: ${error.message}`
      }];
    }
  }

  /**
   * Handle clear command
   */
  private async handleClearCommand(args: string[]): Promise<OutgoingMessage[]> {
    if (args.length === 0) {
      return [{
        type: 'text',
        content: [
          'รูปแบบคำสั่ง:',
          '/admin clear knowledge - ล้างคลังความรู้',
          '/admin clear all - ล้างทั้งหมด',
          '',
          '⚠️ คำเตือน: การดำเนินการนี้ไม่สามารถกู้คืนได้'
        ].join('\n')
      }];
    }

    const target = args[0];

    try {
      switch (target) {
        case 'knowledge':
          const result = await this.kms.clearAllDocuments();
          return [{
            type: 'text',
            content: `✅ ล้างคลังความรู้เรียบร้อยแล้ว\nลบแล้ว: ${result.deletedCount} เอกสาร`
          }];

        case 'all':
          const clearResult = await this.kms.clearAllDocuments();
          return [{
            type: 'text',
            content: `✅ ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว\nลบแล้ว: ${clearResult.deletedCount} เอกสาร`
          }];

        default:
          return [{
            type: 'text',
            content: `ไม่รู้จักเป้าหมาย: ${target}\nใช้ /admin clear เพื่อดูตัวเลือก`
          }];
      }
    } catch (error) {
      return [{
        type: 'text',
        content: `เกิดข้อผิดพลาดในการล้างข้อมูล: ${error.message}`
      }];
    }
  }

  /**
   * Handle stats command
   */
  private async handleStatsCommand(): Promise<OutgoingMessage[]> {
    try {
      const health = await this.kms.getHealthStatus();
      const storageStats = await this.kms.getStorageStats();

      const message = [
        '📈 สถิติระบบ LufyKMS:',
        '',
        `📚 เอกสารทั้งหมด: ${health.totalDocuments}`,
        `💾 ขนาดข้อมูลรวม: ${Math.round((storageStats?.totalSize || 0) / 1024)} KB`,
        ''
      ];

      if (storageStats?.bySource) {
        message.push('📊 แยกตามแหล่งที่มา:');
        Object.entries(storageStats.bySource).forEach(([source, count]) => {
          message.push(`  • ${source}: ${count} เอกสาร`);
        });
        message.push('');
      }

      if (storageStats?.byMimeType) {
        message.push('📋 แยกตามประเภทไฟล์:');
        Object.entries(storageStats.byMimeType).forEach(([type, count]) => {
          message.push(`  • ${type}: ${count} ไฟล์`);
        });
      }

      return [{ type: 'text', content: message.join('\n') }];
    } catch (error) {
      return [{
        type: 'text',
        content: `ไม่สามารถดึงสถิติได้: ${error.message}`
      }];
    }
  }

  /**
   * Handle help command
   */
  private async handleHelpCommand(): Promise<OutgoingMessage[]> {
    const helpMessage = [
      '🔧 คำสั่งผู้ดูแลระบบ LufyKMS:',
      '',
      '📊 ข้อมูลระบบ:',
      '/admin status - ดูสถานะระบบ',
      '/admin docs - ดูเอกสารในคลังความรู้',
      '/admin stats - ดูสถิติการใช้งาน',
      '',
      '🗑️ การจัดการข้อมูล:',
      '/admin clear knowledge - ล้างคลังความรู้',
      '/admin clear all - ล้างข้อมูลทั้งหมด',
      '',
      '/admin help - แสดงคำสั่งนี้',
      '',
      '💡 หมายเหตุ: คำสั่งเหล่านี้ใช้ได้เฉพาะผู้ดูแลระบบเท่านั้น'
    ].join('\n');

    return [{ type: 'text', content: helpMessage }];
  }

  /**
   * Get admin list
   */
  getAdminUsers(): string[] {
    return [...this.adminUsers];
  }

  /**
   * Set admin users
   */
  setAdminUsers(users: string[]): void {
    this.adminUsers = [...users];
  }
}