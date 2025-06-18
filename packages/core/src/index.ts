/**
 * LufyKMS Core Package
 * Main entry point for the knowledge management system
 */

// Types
export * from './types';

// Storage
export { BaseStorageProvider } from './storage/baseStorageProvider';
export { FirestoreStorageProvider } from './storage/firestoreStorageProvider';

// Embeddings
export { BaseEmbeddingProvider } from './embeddings/baseEmbeddingProvider';
export { GoogleEmbeddingProvider } from './embeddings/googleEmbeddingProvider';

// Search
export { BaseSearchProvider } from './search/baseSearchProvider';
export { VectorSearchProvider } from './search/vectorSearchProvider';

// Utils
export { TextSplitter } from './utils/textSplitter';
export { SimilarityCalculator } from './utils/similarity';

// Main KMS class
export { KnowledgeManagementSystem } from './knowledgeManagementSystem';