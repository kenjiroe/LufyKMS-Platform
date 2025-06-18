/**
 * Firestore Storage Provider
 * Implementation using Firebase Firestore
 */

import { BaseStorageProvider } from './baseStorageProvider';
import { Document } from '../types';

export class FirestoreStorageProvider extends BaseStorageProvider {
  private db: any;
  private admin: any;

  constructor(collection: string = 'knowledge_base') {
    super(collection);
    
    // Initialize Firebase Admin if not already initialized
    this.admin = require('firebase-admin');
    if (!this.admin.apps.length) {
      this.admin.initializeApp();
    }
    
    this.db = this.admin.firestore();
  }

  /**
   * Save document to Firestore
   */
  async saveDocument(document: Document): Promise<string> {
    try {
      this.validateDocument(document);
      
      const preparedDoc = this.prepareDocument(document);
      
      console.log(`💾 Saving document to Firestore: ${preparedDoc.id}`);
      console.log(`📊 Content length: ${preparedDoc.content.length} characters`);
      
      // Convert timestamp fields for Firestore
      const firestoreDoc = {
        ...preparedDoc,
        metadata: {
          ...preparedDoc.metadata,
          createdAt: this.admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
        }
      };

      await this.db.collection(this.collection).doc(preparedDoc.id).set(firestoreDoc);
      
      console.log(`✅ Document saved successfully: ${preparedDoc.id}`);
      return preparedDoc.id;
    } catch (error) {
      console.error('❌ Error saving document to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get document by ID from Firestore
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const doc = await this.db.collection(this.collection).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        metadata: data.metadata,
        embedding: data.embedding
      };
    } catch (error) {
      console.error(`❌ Error getting document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents from Firestore
   */
  async getAllDocuments(): Promise<Document[]> {
    try {
      console.log(`📄 Fetching all documents from collection: ${this.collection}`);
      
      const snapshot = await this.db.collection(this.collection).get();
      const documents: Document[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          content: data.content,
          metadata: data.metadata,
          embedding: data.embedding
        });
      });

      console.log(`📄 Fetched ${documents.length} documents`);
      return documents;
    } catch (error) {
      console.error('❌ Error getting all documents:', error);
      throw error;
    }
  }

  /**
   * Delete document from Firestore
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.db.collection(this.collection).doc(id).delete();
      console.log(`🗑️ Document deleted: ${id}`);
    } catch (error) {
      console.error(`❌ Error deleting document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Clear all documents from Firestore
   */
  async clearAllDocuments(): Promise<{ success: boolean; deletedCount: number }> {
    try {
      console.log(`🗑️ Clearing all documents from collection: ${this.collection}`);
      
      const snapshot = await this.db.collection(this.collection).get();
      const batch = this.db.batch();

      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      const deletedCount = snapshot.size;
      console.log(`✅ Cleared ${deletedCount} documents from ${this.collection}`);

      return {
        success: true,
        deletedCount
      };
    } catch (error) {
      console.error('❌ Error clearing knowledge base:', error);
      throw error;
    }
  }

  /**
   * Query documents with Firestore-specific filters
   */
  async queryDocuments(
    field: string, 
    operator: FirebaseFirestore.WhereFilterOp, 
    value: any
  ): Promise<Document[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(`metadata.${field}`, operator, value)
        .get();

      const documents: Document[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          content: data.content,
          metadata: data.metadata,
          embedding: data.embedding
        });
      });

      return documents;
    } catch (error) {
      console.error(`❌ Error querying documents by ${field}:`, error);
      throw error;
    }
  }

  /**
   * Get documents with pagination
   */
  async getDocumentsPaginated(
    limit: number = 10,
    startAfter?: any
  ): Promise<{ documents: Document[]; lastDoc: any }> {
    try {
      let query = this.db
        .collection(this.collection)
        .orderBy('metadata.createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();
      const documents: Document[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          content: data.content,
          metadata: data.metadata,
          embedding: data.embedding
        });
      });

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      return { documents, lastDoc };
    } catch (error) {
      console.error('❌ Error getting paginated documents:', error);
      throw error;
    }
  }

  /**
   * Check Firestore connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.db.collection(this.collection).limit(1).get();
      return true;
    } catch (error) {
      console.error('❌ Firestore connection test failed:', error);
      return false;
    }
  }
}