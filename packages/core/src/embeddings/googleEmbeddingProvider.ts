/**
 * Google AI Embedding Provider
 * Implementation using Google Generative AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseEmbeddingProvider } from './baseEmbeddingProvider';
import { EmbeddingConfig, EmbeddingCache } from '../types';

export class GoogleEmbeddingProvider extends BaseEmbeddingProvider {
  private ai: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string, config: EmbeddingConfig, cache: EmbeddingCache) {
    super(config, cache);
    this.ai = new GoogleGenerativeAI(apiKey);
    this.model = this.ai.getGenerativeModel({ model: config.model });
  }

  /**
   * Generate embedding for a single text chunk using Google AI
   */
  protected async generateSingleEmbedding(text: string): Promise<number[]> {
    return this.retryWrapper(async () => {
      const embedPromise = this.model.embedContent(text);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Embedding generation timeout after 30 seconds')), 30000);
      });

      const result = await Promise.race([embedPromise, timeoutPromise]);
      return result.embedding.values;
    });
  }

  /**
   * Get model information
   */
  getModelInfo(): { model: string; maxTokens: number } {
    return {
      model: this.config.model,
      maxTokens: 8000 // Approximate for text-embedding-004
    };
  }

  /**
   * Validate API key and model availability
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.generateSingleEmbedding('test');
      return true;
    } catch (error) {
      console.error('Google AI connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get embedding dimension
   */
  async getEmbeddingDimension(): Promise<number> {
    try {
      const testEmbedding = await this.generateSingleEmbedding('test');
      return testEmbedding.length;
    } catch (error) {
      console.error('Failed to get embedding dimension:', error);
      return 768; // Default dimension for text-embedding-004
    }
  }
}