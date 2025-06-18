/**
 * Core type definitions for LufyKMS Platform
 */

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
}

export interface DocumentMetadata {
  fileName?: string;
  mimeType?: string;
  source?: 'file_upload' | 'url_download' | 'web-scraping' | 'manual';
  url?: string;
  title?: string;
  description?: string;
  domain?: string;
  userId?: string;
  timestamp: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  similarity: number;
}

export interface EmbeddingConfig {
  model: string;
  maxCharsPerChunk: number;
  cacheSize: number;
}

export interface KnowledgeBaseConfig {
  collection: string;
  embeddingModel: string;
  maxCacheSize: number;
  searchCacheTTL: number;
  documentCacheTTL: number;
}

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  includeMetadata?: boolean;
}

export interface EmbeddingCache {
  has(key: string): boolean;
  get(key: string): number[] | undefined;
  set(key: string, value: number[]): void;
  delete(key: string): boolean;
  clear(): void;
  size: number;
}

export interface StorageProvider {
  saveDocument(document: Document): Promise<string>;
  getDocument(id: string): Promise<Document | null>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: string): Promise<void>;
  clearAllDocuments(): Promise<{ success: boolean; deletedCount: number }>;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
}

export interface SearchProvider {
  searchSimilar(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}