/**
 * Vector Search Provider
 * Implementation using in-memory vector similarity search
 */

import { BaseSearchProvider } from './baseSearchProvider';
import { SearchResult, SearchOptions, StorageProvider, EmbeddingProvider } from '../types';

export class VectorSearchProvider extends BaseSearchProvider {
  private storageProvider: StorageProvider;
  private embeddingProvider: EmbeddingProvider;
  private documentCache: Map<string, any> = new Map();
  private searchCache: Map<string, SearchResult[]> = new Map();
  private cacheTTL: number = 30 * 60 * 1000; // 30 minutes

  constructor(
    storageProvider: StorageProvider,
    embeddingProvider: EmbeddingProvider,
    minSimilarityThreshold: number = 0.1
  ) {
    super(minSimilarityThreshold);
    this.storageProvider = storageProvider;
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * Search for similar documents using vector similarity
   */
  async searchSimilar(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      this.validateQuery(query);
      this.validateOptions(options);

      console.log(`🔍 Starting vector search for: "${query}"`);

      // Check search cache
      const cacheKey = this.createSearchCacheKey(query, options);
      const cachedResults = this.searchCache.get(cacheKey);
      
      if (cachedResults && this.isCacheValid(cacheKey)) {
        console.log(`🚀 Using cached search results (${cachedResults.length} results)`);
        return cachedResults;
      }

      // Generate query embedding
      const embeddingStartTime = Date.now();
      console.log(`⚡ Generating embedding for query...`);
      const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
      const embeddingTime = Date.now() - embeddingStartTime;
      console.log(`✅ Query embedding generated in ${embeddingTime}ms`);

      // Get documents
      const documentsStartTime = Date.now();
      const documents = await this.getDocumentsWithCache();
      const documentsTime = Date.now() - documentsStartTime;
      console.log(`📄 Retrieved ${documents.length} documents in ${documentsTime}ms`);

      // Calculate similarities
      const similarityStartTime = Date.now();
      const results = this.calculateSimilarities(queryEmbedding, documents);
      const similarityTime = Date.now() - similarityStartTime;
      console.log(`🧮 Calculated similarities in ${similarityTime}ms`);

      // Apply options and filters
      const finalResults = this.applySearchOptions(results, options);

      // Cache results
      this.searchCache.set(cacheKey, finalResults);
      this.setCacheTimestamp(cacheKey);

      // Log metrics
      const totalTime = Date.now() - startTime;
      this.logSearchMetrics(query, documents.length, finalResults.length, totalTime);

      if (finalResults.length > 0) {
        console.log(`🥇 Best match: ${finalResults[0].similarity.toFixed(4)} - ${finalResults[0].content.substring(0, 100)}...`);
      }

      return finalResults;
    } catch (error) {
      console.error('❌ Error in vector search:', error);
      throw error;
    }
  }

  /**
   * Get documents with caching
   */
  private async getDocumentsWithCache() {
    const cacheKey = 'all_documents';
    
    if (this.documentCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      console.log(`🚀 Using cached documents`);
      return this.documentCache.get(cacheKey);
    }

    console.log(`📄 Fetching documents from storage...`);
    const documents = await this.storageProvider.getAllDocuments();
    
    // Filter documents with embeddings
    const documentsWithEmbeddings = documents.filter(doc => doc.embedding);
    console.log(`✅ Found ${documentsWithEmbeddings.length} documents with embeddings`);

    // Cache documents
    this.documentCache.set(cacheKey, documentsWithEmbeddings);
    this.setCacheTimestamp(cacheKey);

    return documentsWithEmbeddings;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.documentCache.get(`${cacheKey}_timestamp`);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.cacheTTL;
  }

  /**
   * Set cache timestamp
   */
  private setCacheTimestamp(cacheKey: string): void {
    this.documentCache.set(`${cacheKey}_timestamp`, Date.now());
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.documentCache.clear();
    this.searchCache.clear();
    console.log('🗑️ Cleared all search caches');
  }

  /**
   * Invalidate document cache (call when documents are added/removed)
   */
  invalidateDocumentCache(): void {
    this.documentCache.delete('all_documents');
    this.documentCache.delete('all_documents_timestamp');
    this.searchCache.clear();
    console.log('🗑️ Invalidated document cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    documentCacheSize: number;
    searchCacheSize: number;
    cacheHitRate: number;
  } {
    return {
      documentCacheSize: this.documentCache.size,
      searchCacheSize: this.searchCache.size,
      cacheHitRate: 0 // Would need to track hits/misses
    };
  }

  /**
   * Search with highlighting
   */
  async searchWithHighlights(
    query: string, 
    options: SearchOptions = {}
  ): Promise<Array<SearchResult & { highlights: string[] }>> {
    const results = await this.searchSimilar(query, options);
    
    return results.map(result => ({
      ...result,
      highlights: this.extractHighlights(result.content, query)
    }));
  }

  /**
   * Extract text highlights based on query
   */
  private extractHighlights(content: string, query: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    const highlights: string[] = [];

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const hasQueryWord = queryWords.some(word => 
        word.length > 2 && lowerSentence.includes(word)
      );

      if (hasQueryWord) {
        highlights.push(sentence.trim());
      }
    }

    return highlights.slice(0, 3); // Return top 3 highlights
  }

  /**
   * Get search suggestions based on document content
   */
  async getSearchSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    if (partialQuery.length < 2) return [];

    const documents = await this.getDocumentsWithCache();
    const suggestions = new Set<string>();

    for (const doc of documents) {
      const words = doc.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.startsWith(partialQuery.toLowerCase()) && word.length > partialQuery.length) {
          suggestions.add(word);
          if (suggestions.size >= limit) break;
        }
      }
      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions);
  }

  /**
   * Search within specific metadata criteria
   */
  async searchWithMetadataFilter(
    query: string,
    metadataFilter: Record<string, any>,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const allResults = await this.searchSimilar(query, { ...options, limit: 100 });
    
    return allResults.filter(result => {
      return Object.entries(metadataFilter).every(([key, value]) => {
        return result.metadata[key] === value;
      });
    }).slice(0, options.limit || 5);
  }
}