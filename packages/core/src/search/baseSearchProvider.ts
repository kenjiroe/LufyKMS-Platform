/**
 * Base Search Provider
 * Abstract class for search implementations
 */

import { SearchProvider, SearchResult, SearchOptions, Document } from '../types';
import { SimilarityCalculator } from '../utils/similarity';

export abstract class BaseSearchProvider implements SearchProvider {
  protected minSimilarityThreshold: number = 0.1;

  constructor(minSimilarityThreshold: number = 0.1) {
    this.minSimilarityThreshold = minSimilarityThreshold;
  }

  /**
   * Search for similar documents
   */
  abstract searchSimilar(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Calculate similarity scores for documents
   */
  protected calculateSimilarities(
    queryEmbedding: number[],
    documents: Document[]
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const doc of documents) {
      if (!doc.embedding) {
        console.warn(`Document ${doc.id} has no embedding, skipping`);
        continue;
      }

      try {
        const similarity = SimilarityCalculator.cosineSimilarity(
          queryEmbedding,
          doc.embedding
        );

        if (similarity >= this.minSimilarityThreshold) {
          results.push({
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata,
            similarity
          });
        }
      } catch (error) {
        console.warn(`Error calculating similarity for document ${doc.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Sort results by similarity score
   */
  protected sortResultsBySimilarity(results: SearchResult[]): SearchResult[] {
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Apply search options to results
   */
  protected applySearchOptions(
    results: SearchResult[],
    options: SearchOptions = {}
  ): SearchResult[] {
    let filteredResults = results;

    // Apply minimum similarity filter
    if (options.minSimilarity !== undefined) {
      filteredResults = filteredResults.filter(
        result => result.similarity >= options.minSimilarity!
      );
    }

    // Sort by similarity
    filteredResults = this.sortResultsBySimilarity(filteredResults);

    // Apply limit
    if (options.limit !== undefined) {
      filteredResults = filteredResults.slice(0, options.limit);
    }

    // Filter metadata if requested
    if (options.includeMetadata === false) {
      filteredResults = filteredResults.map(result => ({
        ...result,
        metadata: {} as any
      }));
    }

    return filteredResults;
  }

  /**
   * Log search performance metrics
   */
  protected logSearchMetrics(
    query: string,
    totalDocuments: number,
    resultCount: number,
    searchTimeMs: number
  ): void {
    console.log(`🔍 Search completed for: "${query}"`);
    console.log(`📄 Searched ${totalDocuments} documents`);
    console.log(`🎯 Found ${resultCount} relevant results`);
    console.log(`⏱️ Search time: ${searchTimeMs}ms`);
    
    if (resultCount > 0) {
      console.log(`📊 Relevance rate: ${((resultCount / totalDocuments) * 100).toFixed(1)}%`);
    }
  }

  /**
   * Create search cache key
   */
  protected createSearchCacheKey(query: string, options: SearchOptions = {}): string {
    const optionsKey = JSON.stringify({
      limit: options.limit || 5,
      minSimilarity: options.minSimilarity || this.minSimilarityThreshold,
      includeMetadata: options.includeMetadata !== false
    });
    
    return `search_${query.toLowerCase().trim()}_${optionsKey}`;
  }

  /**
   * Validate search query
   */
  protected validateQuery(query: string): void {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (query.length > 10000) {
      throw new Error('Search query is too long (max 10,000 characters)');
    }
  }

  /**
   * Validate search options
   */
  protected validateOptions(options: SearchOptions = {}): void {
    if (options.limit !== undefined) {
      if (options.limit < 1 || options.limit > 100) {
        throw new Error('Search limit must be between 1 and 100');
      }
    }

    if (options.minSimilarity !== undefined) {
      if (options.minSimilarity < 0 || options.minSimilarity > 1) {
        throw new Error('Minimum similarity must be between 0 and 1');
      }
    }
  }

  /**
   * Prepare search results summary
   */
  protected createSearchSummary(
    query: string,
    results: SearchResult[],
    totalSearched: number
  ): string {
    if (results.length === 0) {
      return `No relevant documents found for "${query}" (searched ${totalSearched} documents)`;
    }

    const bestMatch = results[0];
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

    return [
      `Found ${results.length} relevant documents for "${query}"`,
      `Best match: ${bestMatch.similarity.toFixed(3)} similarity`,
      `Average similarity: ${avgSimilarity.toFixed(3)}`,
      `Searched ${totalSearched} total documents`
    ].join(' | ');
  }
}