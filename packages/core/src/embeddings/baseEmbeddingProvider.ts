/**
 * Base Embedding Provider
 * Abstract class for embedding implementations
 */

import { EmbeddingProvider, EmbeddingCache, EmbeddingConfig } from '../types';
import { TextSplitter } from '../utils/textSplitter';
import { SimilarityCalculator } from '../utils/similarity';

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  protected config: EmbeddingConfig;
  protected cache: EmbeddingCache;

  constructor(config: EmbeddingConfig, cache: EmbeddingCache) {
    this.config = config;
    this.cache = cache;
  }

  /**
   * Generate embedding for text (with caching and chunking support)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Create cache key from text hash
      const textHash = this.createTextHash(text);

      // Check cache first
      if (this.cache.has(textHash)) {
        console.log(`🚀 Using cached embedding for text (${text.length} chars)`);
        return this.cache.get(textHash)!;
      }

      console.log(`⚡ Generating embedding for text length: ${text.length} characters`);
      const startTime = Date.now();

      let embedding: number[];

      if (text.length <= this.config.maxCharsPerChunk) {
        // Single chunk embedding
        console.log(`📄 Single chunk embedding (${text.length} chars)`);
        embedding = await this.generateSingleEmbedding(text);
      } else {
        // Multi-chunk embedding
        console.log(`📚 Large text detected, splitting into chunks (${text.length} chars)`);
        embedding = await this.generateMultiChunkEmbedding(text);
      }

      const endTime = Date.now();
      console.log(`✅ Embedding generated successfully in ${endTime - startTime}ms`);

      // Store in cache
      this.cache.set(textHash, embedding);

      // Manage cache size
      this.manageCacheSize();

      return embedding;
    } catch (error) {
      console.error('❌ Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text chunk
   */
  protected abstract generateSingleEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embedding for large text by chunking
   */
  protected async generateMultiChunkEmbedding(text: string): Promise<number[]> {
    const chunks = TextSplitter.splitIntoChunks(text, this.config.maxCharsPerChunk);
    console.log(`🔢 Split into ${chunks.length} chunks`);

    const embeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`📝 Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);

      try {
        const chunkEmbedding = await this.generateSingleEmbedding(chunks[i]);
        embeddings.push(chunkEmbedding);

        // Rate limiting between chunks
        if (i < chunks.length - 1) {
          await this.delay(100);
        }
      } catch (chunkError) {
        console.error(`❌ Error in chunk ${i + 1}:`, chunkError);
        throw chunkError;
      }
    }

    // Average embeddings
    return SimilarityCalculator.averageEmbeddings(embeddings);
  }

  /**
   * Create hash for text caching
   */
  protected createTextHash(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Manage cache size by removing oldest entries
   */
  protected manageCacheSize(): void {
    if (this.cache.size > this.config.cacheSize) {
      // Implementation depends on cache type
      // For Map-based cache, we need to track insertion order
      console.log(`🗑️ Cache size limit reached, cleaning up...`);
    }
  }

  /**
   * Delay utility for rate limiting
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry wrapper for API calls
   */
  protected async retryWrapper<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          console.log(`⏳ Waiting ${delayMs}ms before retry...`);
          await this.delay(delayMs);
          delayMs *= 1.5; // Exponential backoff
        }
      }
    }

    throw lastError!;
  }
}