/**
 * Similarity Calculation Utilities
 */

export class SimilarityCalculator {
  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  static euclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Calculate Manhattan distance between two vectors
   */
  static manhattanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      sum += Math.abs(vecA[i] - vecB[i]);
    }

    return sum;
  }

  /**
   * Normalize a vector to unit length
   */
  static normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    
    return vector.map(val => val / magnitude);
  }

  /**
   * Average multiple embeddings into a single vector
   */
  static averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('Cannot average empty embeddings array');
    }

    if (embeddings.length === 1) {
      return embeddings[0];
    }

    const dimension = embeddings[0].length;
    const avgEmbedding = new Array(dimension).fill(0);

    // Calculate average
    for (const embedding of embeddings) {
      if (embedding.length !== dimension) {
        throw new Error('All embeddings must have the same dimension');
      }
      
      for (let i = 0; i < dimension; i++) {
        avgEmbedding[i] += embedding[i];
      }
    }

    for (let i = 0; i < dimension; i++) {
      avgEmbedding[i] /= embeddings.length;
    }

    return avgEmbedding;
  }

  /**
   * Weighted average of embeddings
   */
  static weightedAverageEmbeddings(
    embeddings: number[][], 
    weights: number[]
  ): number[] {
    if (embeddings.length !== weights.length) {
      throw new Error('Embeddings and weights arrays must have the same length');
    }

    if (embeddings.length === 0) {
      throw new Error('Cannot average empty embeddings array');
    }

    const dimension = embeddings[0].length;
    const weightedEmbedding = new Array(dimension).fill(0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight === 0) {
      throw new Error('Total weight cannot be zero');
    }

    // Calculate weighted average
    for (let i = 0; i < embeddings.length; i++) {
      const embedding = embeddings[i];
      const weight = weights[i];

      if (embedding.length !== dimension) {
        throw new Error('All embeddings must have the same dimension');
      }

      for (let j = 0; j < dimension; j++) {
        weightedEmbedding[j] += embedding[j] * weight;
      }
    }

    // Normalize by total weight
    for (let i = 0; i < dimension; i++) {
      weightedEmbedding[i] /= totalWeight;
    }

    return weightedEmbedding;
  }
}