/**
 * Base Storage Provider
 * Abstract class for document storage implementations
 */

import { StorageProvider, Document, DocumentMetadata } from '../types';

export abstract class BaseStorageProvider implements StorageProvider {
  protected collection: string;

  constructor(collection: string = 'knowledge_base') {
    this.collection = collection;
  }

  /**
   * Save document to storage
   */
  abstract saveDocument(document: Document): Promise<string>;

  /**
   * Get document by ID
   */
  abstract getDocument(id: string): Promise<Document | null>;

  /**
   * Get all documents
   */
  abstract getAllDocuments(): Promise<Document[]>;

  /**
   * Delete document by ID
   */
  abstract deleteDocument(id: string): Promise<void>;

  /**
   * Clear all documents
   */
  abstract clearAllDocuments(): Promise<{ success: boolean; deletedCount: number }>;

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(id: string, metadata: Partial<DocumentMetadata>): Promise<void> {
    const document = await this.getDocument(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    document.metadata = {
      ...document.metadata,
      ...metadata,
      updatedAt: new Date().toISOString()
    };

    await this.saveDocument(document);
  }

  /**
   * Search documents by metadata
   */
  async searchByMetadata(query: Partial<DocumentMetadata>): Promise<Document[]> {
    const allDocuments = await this.getAllDocuments();
    
    return allDocuments.filter(doc => {
      return Object.entries(query).every(([key, value]) => {
        return doc.metadata[key] === value;
      });
    });
  }

  /**
   * Get documents by source
   */
  async getDocumentsBySource(source: string): Promise<Document[]> {
    return this.searchByMetadata({ source: source as any });
  }

  /**
   * Get documents by user
   */
  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return this.searchByMetadata({ userId });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    bySource: Record<string, number>;
    byMimeType: Record<string, number>;
  }> {
    const documents = await this.getAllDocuments();
    
    const stats = {
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.content.length, 0),
      bySource: {} as Record<string, number>,
      byMimeType: {} as Record<string, number>
    };

    documents.forEach(doc => {
      // Count by source
      const source = doc.metadata.source || 'unknown';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;

      // Count by mime type
      const mimeType = doc.metadata.mimeType || 'unknown';
      stats.byMimeType[mimeType] = (stats.byMimeType[mimeType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Validate document before saving
   */
  protected validateDocument(document: Document): void {
    if (!document.id) {
      throw new Error('Document ID is required');
    }

    if (!document.content || document.content.trim().length === 0) {
      throw new Error('Document content cannot be empty');
    }

    if (!document.metadata) {
      throw new Error('Document metadata is required');
    }

    if (!document.metadata.timestamp) {
      throw new Error('Document timestamp is required');
    }
  }

  /**
   * Generate document ID if not provided
   */
  protected generateDocumentId(): string {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  /**
   * Prepare document for storage
   */
  protected prepareDocument(document: Partial<Document>): Document {
    const now = new Date().toISOString();
    
    return {
      id: document.id || this.generateDocumentId(),
      content: document.content || '',
      metadata: {
        ...document.metadata,
        timestamp: document.metadata?.timestamp || now,
        createdAt: document.metadata?.createdAt || now,
        updatedAt: now
      },
      embedding: document.embedding
    };
  }
}