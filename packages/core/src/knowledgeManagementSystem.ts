/**
 * Main Knowledge Management System
 * Orchestrates storage, embeddings, and search
 */

import { 
  Document, 
  DocumentMetadata, 
  SearchResult, 
  SearchOptions,
  KnowledgeBaseConfig,
  StorageProvider,
  EmbeddingProvider,
  SearchProvider
} from './types';

export class KnowledgeManagementSystem {
  private storageProvider: StorageProvider;
  private embeddingProvider: EmbeddingProvider;
  private searchProvider: SearchProvider;
  private config: KnowledgeBaseConfig;

  constructor(
    storageProvider: StorageProvider,
    embeddingProvider: EmbeddingProvider,
    searchProvider: SearchProvider,
    config: Partial<KnowledgeBaseConfig> = {}
  ) {
    this.storageProvider = storageProvider;
    this.embeddingProvider = embeddingProvider;
    this.searchProvider = searchProvider;
    
    this.config = {
      collection: 'knowledge_base',
      embeddingModel: 'text-embedding-004',
      maxCacheSize: 100,
      searchCacheTTL: 1800, // 30 minutes
      documentCacheTTL: 3600, // 1 hour
      ...config
    };
  }

  /**
   * Add document to knowledge base
   */
  async addDocument(content: string, metadata: DocumentMetadata = {} as DocumentMetadata): Promise<string> {
    try {
      console.log(`📚 Adding document to knowledge base`);
      console.log(`📊 Content length: ${content.length} characters`);

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('Document content cannot be empty');
      }

      // Generate embedding
      console.log(`⚡ Generating embedding...`);
      const embeddingStartTime = Date.now();
      const embedding = await this.embeddingProvider.generateEmbedding(content);
      const embeddingTime = Date.now() - embeddingStartTime;
      console.log(`✅ Embedding generated in ${embeddingTime}ms`);

      // Prepare document
      const document: Document = {
        id: this.generateDocumentId(),
        content,
        metadata: {
          ...metadata,
          timestamp: metadata.timestamp || new Date().toISOString()
        },
        embedding
      };

      // Save to storage
      console.log(`💾 Saving document to storage...`);
      const docId = await this.storageProvider.saveDocument(document);

      // Invalidate search cache if applicable
      if ('invalidateDocumentCache' in this.searchProvider) {
        (this.searchProvider as any).invalidateDocumentCache();
      }

      console.log(`✅ Document added successfully: ${docId}`);
      return docId;
    } catch (error) {
      console.error('❌ Error adding document:', error);
      throw error;
    }
  }

  /**
   * Search for documents
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Searching knowledge base for: "${query}"`);
      
      const results = await this.searchProvider.searchSimilar(query, {
        limit: 5,
        minSimilarity: 0.1,
        includeMetadata: true,
        ...options
      });

      console.log(`🎯 Found ${results.length} relevant documents`);
      return results;
    } catch (error) {
      console.error('❌ Error searching knowledge base:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      return await this.storageProvider.getDocument(id);
    } catch (error) {
      console.error(`❌ Error getting document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<Document[]> {
    try {
      return await this.storageProvider.getAllDocuments();
    } catch (error) {
      console.error('❌ Error getting all documents:', error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDocument(id: string, content?: string, metadata?: Partial<DocumentMetadata>): Promise<void> {
    try {
      const existingDoc = await this.storageProvider.getDocument(id);
      if (!existingDoc) {
        throw new Error(`Document not found: ${id}`);
      }

      const updatedContent = content || existingDoc.content;
      const updatedMetadata = {
        ...existingDoc.metadata,
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      // Regenerate embedding if content changed
      let embedding = existingDoc.embedding;
      if (content && content !== existingDoc.content) {
        console.log(`⚡ Regenerating embedding for updated content...`);
        embedding = await this.embeddingProvider.generateEmbedding(updatedContent);
      }

      const updatedDoc: Document = {
        id,
        content: updatedContent,
        metadata: updatedMetadata,
        embedding
      };

      await this.storageProvider.saveDocument(updatedDoc);

      // Invalidate cache
      if ('invalidateDocumentCache' in this.searchProvider) {
        (this.searchProvider as any).invalidateDocumentCache();
      }

      console.log(`✅ Document updated: ${id}`);
    } catch (error) {
      console.error(`❌ Error updating document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.storageProvider.deleteDocument(id);

      // Invalidate cache
      if ('invalidateDocumentCache' in this.searchProvider) {
        (this.searchProvider as any).invalidateDocumentCache();
      }

      console.log(`🗑️ Document deleted: ${id}`);
    } catch (error) {
      console.error(`❌ Error deleting document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Clear all documents
   */
  async clearAllDocuments(): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await this.storageProvider.clearAllDocuments();

      // Clear all caches
      if ('clearCache' in this.searchProvider) {
        (this.searchProvider as any).clearCache();
      }

      console.log(`🗑️ Cleared all documents: ${result.deletedCount} removed`);
      return result;
    } catch (error) {
      console.error('❌ Error clearing all documents:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      if ('getStorageStats' in this.storageProvider) {
        return await (this.storageProvider as any).getStorageStats();
      }
      
      // Fallback: basic stats
      const documents = await this.getAllDocuments();
      return {
        totalDocuments: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + doc.content.length, 0)
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    storage: boolean;
    embedding: boolean;
    search: boolean;
    totalDocuments: number;
  }> {
    try {
      const [storageHealthy, embeddingHealthy, documents] = await Promise.all([
        this.testStorageConnection(),
        this.testEmbeddingConnection(),
        this.getAllDocuments()
      ]);

      return {
        storage: storageHealthy,
        embedding: embeddingHealthy,
        search: true, // Search is always available if storage works
        totalDocuments: documents.length
      };
    } catch (error) {
      console.error('❌ Error getting health status:', error);
      return {
        storage: false,
        embedding: false,
        search: false,
        totalDocuments: 0
      };
    }
  }

  /**
   * Test storage connection
   */
  private async testStorageConnection(): Promise<boolean> {
    try {
      if ('testConnection' in this.storageProvider) {
        return await (this.storageProvider as any).testConnection();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test embedding connection
   */
  private async testEmbeddingConnection(): Promise<boolean> {
    try {
      if ('validateConnection' in this.embeddingProvider) {
        return await (this.embeddingProvider as any).validateConnection();
      }
      
      // Fallback: try to generate a test embedding
      await this.embeddingProvider.generateEmbedding('test');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  /**
   * Get configuration
   */
  getConfig(): KnowledgeBaseConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<KnowledgeBaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}