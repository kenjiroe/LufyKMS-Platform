/**
 * LINE Rich Menu Manager
 * Manages LINE Rich Menu setup and configuration
 */

import { LineApiClient } from './lineApiClient';

export class LineRichMenuManager {
  private apiClient: LineApiClient;

  constructor(apiClient: LineApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Setup default rich menu
   */
  async setupDefaultRichMenu(): Promise<string> {
    try {
      // Try different menu configurations in order
      const menuConfigs = [
        this.getFullRichMenuConfig(),
        this.getSimpleRichMenuConfig(),
        this.getMinimalRichMenuConfig()
      ];

      for (const config of menuConfigs) {
        try {
          console.log(`Trying to create ${config.name}...`);
          
          // Create rich menu
          const { richMenuId } = await this.apiClient.createRichMenu(config);
          console.log(`Created rich menu: ${richMenuId}`);

          // Generate and upload image
          const imageBuffer = this.generateRichMenuImage(config);
          await this.apiClient.uploadRichMenuImage(richMenuId, imageBuffer);
          console.log(`Uploaded image for rich menu: ${richMenuId}`);

          // Set as default
          await this.apiClient.setDefaultRichMenu(richMenuId);
          console.log(`Set default rich menu: ${richMenuId}`);

          return richMenuId;
        } catch (error) {
          console.warn(`Failed to create ${config.name}:`, error.message);
          continue;
        }
      }

      throw new Error('All rich menu configurations failed');
    } catch (error) {
      console.error('Error setting up rich menu:', error);
      throw error;
    }
  }

  /**
   * Clear all rich menus
   */
  async clearAllRichMenus(): Promise<number> {
    try {
      const { richmenus } = await this.apiClient.listRichMenus();
      let deletedCount = 0;

      for (const menu of richmenus) {
        try {
          await this.apiClient.deleteRichMenu(menu.richMenuId);
          deletedCount++;
          console.log(`Deleted rich menu: ${menu.richMenuId}`);
        } catch (error) {
          console.warn(`Failed to delete rich menu ${menu.richMenuId}:`, error.message);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error clearing rich menus:', error);
      throw error;
    }
  }

  /**
   * Get full rich menu configuration
   */
  private getFullRichMenuConfig(): any {
    return {
      size: { width: 2500, height: 1686 },
      selected: false,
      name: 'STOU Knowledge Bot Menu',
      chatBarText: 'เมนู',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: { type: 'message', text: 'ค้นหาข้อมูล' }
        },
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: { type: 'message', text: 'คำถามถามบ่อย' }
        },
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: { type: 'message', text: 'วิธีใช้งาน' }
        },
        {
          bounds: { x: 0, y: 843, width: 833, height: 843 },
          action: { type: 'message', text: 'การลงทะเบียนเรียน' }
        },
        {
          bounds: { x: 833, y: 843, width: 834, height: 843 },
          action: { type: 'message', text: 'การสำเร็จการศึกษา' }
        },
        {
          bounds: { x: 1667, y: 843, width: 833, height: 843 },
          action: { type: 'uri', uri: 'https://www.stou.ac.th' }
        }
      ]
    };
  }

  /**
   * Get simple rich menu configuration
   */
  private getSimpleRichMenuConfig(): any {
    return {
      size: { width: 2500, height: 843 },
      selected: false,
      name: 'Simple STOU Menu',
      chatBarText: 'เมนู',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 1250, height: 843 },
          action: { type: 'message', text: 'ค้นหาข้อมูล' }
        },
        {
          bounds: { x: 1250, y: 0, width: 1250, height: 843 },
          action: { type: 'message', text: 'คำถามถามบ่อย' }
        }
      ]
    };
  }

  /**
   * Get minimal rich menu configuration
   */
  private getMinimalRichMenuConfig(): any {
    return {
      size: { width: 800, height: 270 },
      selected: false,
      name: 'Minimal Menu',
      chatBarText: 'สวัสดี',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 800, height: 270 },
          action: { type: 'message', text: 'สวัสดี! ถามคำถามใดๆ ได้เลย' }
        }
      ]
    };
  }

  /**
   * Generate rich menu image (placeholder - would need actual image generation)
   */
  private generateRichMenuImage(config: any): Buffer {
    // This is a placeholder. In a real implementation, you would:
    // 1. Use a graphics library like Canvas or Sharp
    // 2. Generate an image based on the menu configuration
    // 3. Return the image as a Buffer
    
    // For now, return a minimal PNG
    const width = config.size.width;
    const height = config.size.height;
    
    // Create a simple solid color PNG
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(0, 0, width, height);
    
    // Draw menu areas
    config.areas.forEach((area: any, index: number) => {
      const colors = ['#007BFF', '#28A745', '#FFC107', '#DC3545', '#6F42C1', '#20C997'];
      const color = colors[index % colors.length];
      
      ctx.fillStyle = color;
      ctx.fillRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
      
      // Add border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);
      
      // Add text (simplified)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const text = this.getButtonText(area.action, index);
      const centerX = area.bounds.x + area.bounds.width / 2;
      const centerY = area.bounds.y + area.bounds.height / 2;
      
      ctx.fillText(text, centerX, centerY);
    });
    
    return canvas.toBuffer('image/png');
  }

  /**
   * Get button text for rich menu area
   */
  private getButtonText(action: any, index: number): string {
    if (action.type === 'message') {
      switch (action.text) {
        case 'ค้นหาข้อมูล': return '🔍 ค้นหา';
        case 'คำถามถามบ่อย': return '❓ FAQ';
        case 'วิธีใช้งาน': return '📚 วิธีใช้';
        case 'การลงทะเบียนเรียน': return '📄 ลงทะเบียน';
        case 'การสำเร็จการศึกษา': return '🎓 จบการศึกษา';
        case 'สวัสดี! ถามคำถามใดๆ ได้เลย': return '🤖 สวัสดี';
        default: return action.text.substring(0, 10);
      }
    } else if (action.type === 'uri') {
      return '🌐 เว็บไซต์';
    }
    
    return `Button ${index + 1}`;
  }

  /**
   * Test rich menu permissions
   */
  async testRichMenuPermissions(): Promise<{
    canList: boolean;
    canCreate: boolean;
    canUploadImage: boolean;
    canSetDefault: boolean;
    canDelete: boolean;
    errors: string[];
  }> {
    const result = {
      canList: false,
      canCreate: false,
      canUploadImage: false,
      canSetDefault: false,
      canDelete: false,
      errors: [] as string[]
    };

    try {
      // Test listing
      await this.apiClient.listRichMenus();
      result.canList = true;
    } catch (error) {
      result.errors.push(`List failed: ${error.message}`);
    }

    try {
      // Test creating
      const testMenu = this.getMinimalRichMenuConfig();
      const { richMenuId } = await this.apiClient.createRichMenu(testMenu);
      result.canCreate = true;

      try {
        // Test image upload
        const imageBuffer = this.generateRichMenuImage(testMenu);
        await this.apiClient.uploadRichMenuImage(richMenuId, imageBuffer);
        result.canUploadImage = true;
      } catch (error) {
        result.errors.push(`Image upload failed: ${error.message}`);
      }

      try {
        // Test setting default
        await this.apiClient.setDefaultRichMenu(richMenuId);
        result.canSetDefault = true;
      } catch (error) {
        result.errors.push(`Set default failed: ${error.message}`);
      }

      try {
        // Test deletion
        await this.apiClient.deleteRichMenu(richMenuId);
        result.canDelete = true;
      } catch (error) {
        result.errors.push(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      result.errors.push(`Create failed: ${error.message}`);
    }

    return result;
  }
}