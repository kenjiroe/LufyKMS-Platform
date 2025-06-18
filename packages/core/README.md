# @lufykms/core

Core Knowledge Management System engine for LufyKMS Platform.

## 🎯 Overview

The core package provides the fundamental knowledge management capabilities including document storage, vector embeddings, similarity search, and intelligent text processing.

## ✨ Features

- **Vector Similarity Search** with Google AI embeddings
- **Multi-provider Architecture** (Storage, Embedding, Search providers)
- **Intelligent Text Chunking** for large documents
- **Advanced Caching** (embeddings, documents, search results)
- **Type-safe APIs** with full TypeScript support
- **Performance Monitoring** and metrics
- **Extensible Design** for custom providers

## 📦 Installation

```bash
npm install @lufykms/core
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { 
  KnowledgeManagementSystem,
  FirestoreStorageProvider,
  GoogleEmbeddingProvider,
  VectorSearchProvider
} from '@lufykms/core';

// Initialize providers
const storage = new FirestoreStorageProvider('knowledge_base');
const embedding = new GoogleEmbeddingProvider(
  process.env.GOOGLE_AI_API_KEY!,
  {
    model: 'text-embedding-004',
    maxCharsPerChunk: 8000,
    cacheSize: 100
  },
  new Map() // Cache implementation
);
const search = new VectorSearchProvider(storage, embedding);

// Create KMS instance
const kms = new KnowledgeManagementSystem(storage, embedding, search);

// Add document
const docId = await kms.addDocument('Your document content here', {
  fileName: 'example.txt',
  source: 'manual',
  timestamp: new Date().toISOString()
});

// Search documents
const results = await kms.search('your search query', {
  limit: 5,
  minSimilarity: 0.1
});

console.log(`Found ${results.length} relevant documents`);
```

## 🏗️ Architecture

### Provider Pattern

The core uses a provider pattern for maximum flexibility:

```typescript
// Storage Provider Interface
interface StorageProvider {
  saveDocument(document: Document): Promise<string>;
  getDocument(id: string): Promise<Document | null>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: string): Promise<void>;
  clearAllDocuments(): Promise<{ success: boolean; deletedCount: number }>;
}

// Embedding Provider Interface  
interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
}

// Search Provider Interface
interface SearchProvider {
  searchSimilar(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
```

### Components Overview

```
@lufykms/core/
├── src/
│   ├── types/                # TypeScript interfaces
│   ├── storage/              # Storage providers
│   │   ├── baseStorageProvider.ts
│   │   └── firestoreStorageProvider.ts
│   ├── embeddings/           # Embedding providers
│   │   ├── baseEmbeddingProvider.ts
│   │   └── googleEmbeddingProvider.ts
│   ├── search/               # Search providers
│   │   ├── baseSearchProvider.ts
│   │   └── vectorSearchProvider.ts
│   ├── utils/                # Utilities
│   │   ├── textSplitter.ts
│   │   └── similarity.ts
│   └── knowledgeManagementSystem.ts
```

## 📚 API Reference

### KnowledgeManagementSystem

Main class that orchestrates all providers.

#### Constructor

```typescript
constructor(
  storageProvider: StorageProvider,
  embeddingProvider: EmbeddingProvider,
  searchProvider: SearchProvider,
  config?: Partial<KnowledgeBaseConfig>
)
```

#### Methods

##### `addDocument(content: string, metadata?: DocumentMetadata): Promise<string>`

Add a document to the knowledge base.

```typescript
const docId = await kms.addDocument('Document content', {
  fileName: 'example.txt',
  source: 'file_upload',
  userId: 'user123',
  timestamp: new Date().toISOString()
});
```

##### `search(query: string, options?: SearchOptions): Promise<SearchResult[]>`

Search for relevant documents.

```typescript
const results = await kms.search('machine learning', {
  limit: 10,
  minSimilarity: 0.2,
  includeMetadata: true
});
```

##### `getDocument(id: string): Promise<Document | null>`

Retrieve a document by ID.

```typescript
const document = await kms.getDocument(docId);
```

##### `updateDocument(id: string, content?: string, metadata?: Partial<DocumentMetadata>): Promise<void>`

Update an existing document.

```typescript
await kms.updateDocument(docId, newContent, {
  updatedAt: new Date().toISOString()
});
```

##### `deleteDocument(id: string): Promise<void>`

Delete a document.

```typescript
await kms.deleteDocument(docId);
```

##### `clearAllDocuments(): Promise<{ success: boolean; deletedCount: number }>`

Clear all documents from the knowledge base.

```typescript
const result = await kms.clearAllDocuments();
console.log(`Deleted ${result.deletedCount} documents`);
```

##### `getHealthStatus(): Promise<HealthStatus>`

Get system health status.

```typescript
const health = await kms.getHealthStatus();
console.log('Storage:', health.storage ? 'OK' : 'ERROR');
console.log('Embedding:', health.embedding ? 'OK' : 'ERROR');
console.log('Total documents:', health.totalDocuments);
```

### Storage Providers

#### FirestoreStorageProvider

Uses Google Firestore for document storage.

```typescript
const storage = new FirestoreStorageProvider('my_collection');

// Query with Firestore-specific filters
const documents = await storage.queryDocuments('source', '==', 'file_upload');

// Paginated results
const { documents, lastDoc } = await storage.getDocumentsPaginated(10);
```

#### Custom Storage Provider

Create your own storage provider:

```typescript
class CustomStorageProvider extends BaseStorageProvider {
  async saveDocument(document: Document): Promise<string> {
    // Your implementation
    return document.id;
  }

  async getDocument(id: string): Promise<Document | null> {
    // Your implementation
    return null;
  }

  // Implement other required methods...
}
```

### Embedding Providers

#### GoogleEmbeddingProvider

Uses Google AI for text embeddings.

```typescript
const embedding = new GoogleEmbeddingProvider(
  apiKey,
  {
    model: 'text-embedding-004',
    maxCharsPerChunk: 8000,
    cacheSize: 100
  },
  new Map() // Cache implementation
);

// Get embedding dimension
const dimension = await embedding.getEmbeddingDimension(); // 768

// Validate connection
const isValid = await embedding.validateConnection();
```

#### Custom Embedding Provider

```typescript
class CustomEmbeddingProvider extends BaseEmbeddingProvider {
  protected async generateSingleEmbedding(text: string): Promise<number[]> {
    // Your embedding implementation
    return new Array(768).fill(0); // Example: 768-dimensional zero vector
  }
}
```

### Search Providers

#### VectorSearchProvider

In-memory vector similarity search with caching.

```typescript
const search = new VectorSearchProvider(storage, embedding, 0.1);

// Search with metadata filtering
const results = await search.searchWithMetadataFilter(
  'query',
  { source: 'file_upload' },
  { limit: 5 }
);

// Search with highlights
const highlighted = await search.searchWithHighlights('query');
console.log(highlighted[0].highlights); // Relevant text snippets

// Get search suggestions
const suggestions = await search.getSearchSuggestions('mach'); // ['machine', 'matching', ...]

// Cache management
search.clearCache();
search.invalidateDocumentCache();
```

## 🔧 Configuration

### KnowledgeBaseConfig

```typescript
interface KnowledgeBaseConfig {
  collection: string;           // Firestore collection name
  embeddingModel: string;       // Google AI model name
  maxCacheSize: number;         // Max embedding cache entries
  searchCacheTTL: number;       // Search cache TTL (seconds)
  documentCacheTTL: number;     // Document cache TTL (seconds)
}
```

### EmbeddingConfig

```typescript
interface EmbeddingConfig {
  model: string;                // Model name (e.g., 'text-embedding-004')
  maxCharsPerChunk: number;     // Max characters per chunk (8000)
  cacheSize: number;            // Cache size limit (100)
}
```

### SearchOptions

```typescript
interface SearchOptions {
  limit?: number;               // Max results (5)
  minSimilarity?: number;       // Min similarity threshold (0.1)
  includeMetadata?: boolean;    // Include metadata in results (true)
}
```

## 🛠️ Utilities

### TextSplitter

Intelligent text chunking for large documents.

```typescript
import { TextSplitter } from '@lufykms/core';

// Basic chunking
const chunks = TextSplitter.splitIntoChunks(longText, 8000);

// Detailed chunks with metadata
const detailedChunks = TextSplitter.splitIntoDetailedChunks(longText);

// Estimate optimal chunk size
const optimalSize = TextSplitter.estimateOptimalChunkSize(text);
```

### SimilarityCalculator

Vector similarity calculations.

```typescript
import { SimilarityCalculator } from '@lufykms/core';

// Cosine similarity
const similarity = SimilarityCalculator.cosineSimilarity(vectorA, vectorB);

// Average multiple embeddings
const avgEmbedding = SimilarityCalculator.averageEmbeddings([embed1, embed2, embed3]);

// Weighted average
const weightedAvg = SimilarityCalculator.weightedAverageEmbeddings(
  [embed1, embed2], 
  [0.7, 0.3]
);

// Normalize vector
const normalized = SimilarityCalculator.normalize(vector);
```

## 📊 Performance & Monitoring

### Caching Strategy

The core implements multi-level caching:

1. **Embedding Cache**: MD5-based cache for generated embeddings
2. **Document Cache**: TTL-based cache for document storage
3. **Search Cache**: Query-based cache for search results

### Performance Tips

1. **Chunking**: Optimize `maxCharsPerChunk` based on your content
2. **Caching**: Increase cache sizes for better performance
3. **Batch Operations**: Use batch operations for multiple documents
4. **Monitoring**: Track metrics with `getHealthStatus()`

### Metrics

```typescript
// Get storage statistics
const stats = await kms.getStorageStats();
console.log(`Total documents: ${stats.totalDocuments}`);
console.log(`Total size: ${stats.totalSize} bytes`);
console.log(`By source:`, stats.bySource);

// Get cache statistics (if supported)
const cacheStats = search.getCacheStats();
console.log(`Cache hit rate: ${cacheStats.cacheHitRate}%`);
```

## 🔍 Advanced Usage

### Custom Document Processing

```typescript
// Add document with custom processing
const docId = await kms.addDocument(content, {
  fileName: 'custom.txt',
  source: 'api',
  customField: 'value',
  processingOptions: {
    extractTables: true,
    generateSummary: true
  }
});
```

### Batch Operations

```typescript
// Add multiple documents
const documents = ['doc1 content', 'doc2 content', 'doc3 content'];
const docIds = await Promise.all(
  documents.map((content, i) => 
    kms.addDocument(content, { fileName: `doc${i+1}.txt` })
  )
);
```

### Search Result Processing

```typescript
const results = await kms.search('query');

// Process results
for (const result of results) {
  console.log(`Document: ${result.id}`);
  console.log(`Similarity: ${result.similarity.toFixed(3)}`);
  console.log(`Source: ${result.metadata.source}`);
  console.log(`Preview: ${result.content.substring(0, 100)}...`);
}
```

## 🧪 Testing

```typescript
import { KnowledgeManagementSystem } from '@lufykms/core';

// Create test instance with mock providers
const mockStorage = new MockStorageProvider();
const mockEmbedding = new MockEmbeddingProvider();
const mockSearch = new MockSearchProvider();

const kms = new KnowledgeManagementSystem(
  mockStorage, 
  mockEmbedding, 
  mockSearch
);

// Test document operations
await kms.addDocument('test content');
const results = await kms.search('test');
expect(results.length).toBeGreaterThan(0);
```

## 📄 Types Reference

See [types/index.ts](src/types/index.ts) for complete type definitions:

- `Document` - Document structure
- `DocumentMetadata` - Document metadata
- `SearchResult` - Search result structure
- `SearchOptions` - Search configuration
- `StorageProvider` - Storage interface
- `EmbeddingProvider` - Embedding interface
- `SearchProvider` - Search interface

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Ensure backward compatibility
5. Use semantic versioning

---

**Related Packages:**
- [@lufykms/plugins](../plugins) - Plugin framework and implementations
- [Examples](/examples) - Usage examples and starter templates