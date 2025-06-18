/**
 * Text Splitter Utility
 * Handles intelligent text chunking for large documents
 */

export interface TextChunk {
  content: string;
  index: number;
  startPosition: number;
  endPosition: number;
}

export class TextSplitter {
  /**
   * Split text into chunks with intelligent boundary detection
   */
  static splitIntoChunks(text: string, maxChars: number = 8000): string[] {
    const chunks: string[] = [];
    let currentPos = 0;

    while (currentPos < text.length) {
      let endPos = Math.min(currentPos + maxChars, text.length);

      // Find optimal cut point (after sentence, newline, or space)
      if (endPos < text.length) {
        const lastPeriod = text.lastIndexOf('.', endPos);
        const lastNewline = text.lastIndexOf('\n', endPos);
        const lastSpace = text.lastIndexOf(' ', endPos);

        const bestCutPoint = Math.max(lastPeriod, lastNewline, lastSpace);
        if (bestCutPoint > currentPos + maxChars * 0.8) {
          endPos = bestCutPoint + 1;
        }
      }

      const chunk = text.substring(currentPos, endPos).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      currentPos = endPos;
    }

    return chunks;
  }

  /**
   * Split text into detailed chunks with metadata
   */
  static splitIntoDetailedChunks(text: string, maxChars: number = 8000): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentPos = 0;
    let chunkIndex = 0;

    while (currentPos < text.length) {
      let endPos = Math.min(currentPos + maxChars, text.length);

      // Find optimal cut point
      if (endPos < text.length) {
        const lastPeriod = text.lastIndexOf('.', endPos);
        const lastNewline = text.lastIndexOf('\n', endPos);
        const lastSpace = text.lastIndexOf(' ', endPos);

        const bestCutPoint = Math.max(lastPeriod, lastNewline, lastSpace);
        if (bestCutPoint > currentPos + maxChars * 0.8) {
          endPos = bestCutPoint + 1;
        }
      }

      const content = text.substring(currentPos, endPos).trim();
      if (content.length > 0) {
        chunks.push({
          content,
          index: chunkIndex++,
          startPosition: currentPos,
          endPosition: endPos
        });
      }
      
      currentPos = endPos;
    }

    return chunks;
  }

  /**
   * Estimate optimal chunk size based on text characteristics
   */
  static estimateOptimalChunkSize(text: string): number {
    const avgSentenceLength = this.calculateAverageSentenceLength(text);
    const hasLongParagraphs = this.hasLongParagraphs(text);
    
    // Adjust chunk size based on text characteristics
    let optimalSize = 8000; // Default
    
    if (avgSentenceLength > 200) {
      optimalSize = 10000; // Longer chunks for academic/technical text
    } else if (avgSentenceLength < 50) {
      optimalSize = 6000; // Shorter chunks for conversational text
    }
    
    if (hasLongParagraphs) {
      optimalSize += 2000; // Accommodate long paragraphs
    }
    
    return Math.min(optimalSize, 12000); // Cap at 12k chars
  }

  private static calculateAverageSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    return totalLength / sentences.length;
  }

  private static hasLongParagraphs(text: string): boolean {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    return paragraphs.some(paragraph => paragraph.length > 1000);
  }
}