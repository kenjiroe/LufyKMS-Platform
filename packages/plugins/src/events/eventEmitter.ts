/**
 * Event Emitter for Plugin Communication
 */

import { EventEmitter as BaseEventEmitter } from 'events';
import { PluginEvent } from '../types';

export class PluginEventEmitter extends BaseEventEmitter {
  private eventHistory: PluginEvent[] = [];
  private maxHistorySize: number = 1000;

  constructor(maxHistorySize: number = 1000) {
    super();
    this.maxHistorySize = maxHistorySize;
    this.setMaxListeners(50); // Allow more listeners for plugins
  }

  /**
   * Emit plugin event with metadata
   */
  emitPluginEvent(type: string, source: string, data: any): void {
    const event: PluginEvent = {
      type,
      source,
      timestamp: new Date().toISOString(),
      data
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit the event
    this.emit(type, event);
    this.emit('*', event); // Global listener
  }

  /**
   * Get event history
   */
  getEventHistory(type?: string, limit: number = 100): PluginEvent[] {
    let events = this.eventHistory;
    
    if (type) {
      events = events.filter(event => event.type === type);
    }
    
    return events.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get event statistics
   */
  getEventStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySource: Record<string, number>;
    recentEvents: number;
  } {
    const stats = {
      totalEvents: this.eventHistory.length,
      eventsByType: {} as Record<string, number>,
      eventsBySource: {} as Record<string, number>,
      recentEvents: 0
    };

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    this.eventHistory.forEach(event => {
      // Count by type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      
      // Count by source
      stats.eventsBySource[event.source] = (stats.eventsBySource[event.source] || 0) + 1;
      
      // Count recent events
      if (new Date(event.timestamp).getTime() > oneHourAgo) {
        stats.recentEvents++;
      }
    });

    return stats;
  }

  /**
   * Create a namespaced event emitter for a plugin
   */
  createNamespacedEmitter(namespace: string): NamespacedEventEmitter {
    return new NamespacedEventEmitter(this, namespace);
  }
}

export class NamespacedEventEmitter {
  private parentEmitter: PluginEventEmitter;
  private namespace: string;

  constructor(parentEmitter: PluginEventEmitter, namespace: string) {
    this.parentEmitter = parentEmitter;
    this.namespace = namespace;
  }

  /**
   * Emit event with namespace prefix
   */
  emit(event: string, ...args: any[]): void {
    const namespacedEvent = `${this.namespace}:${event}`;
    this.parentEmitter.emitPluginEvent(namespacedEvent, this.namespace, args);
  }

  /**
   * Listen to namespaced events
   */
  on(event: string, listener: (...args: any[]) => void): void {
    const namespacedEvent = `${this.namespace}:${event}`;
    this.parentEmitter.on(namespacedEvent, (pluginEvent: PluginEvent) => {
      listener(...pluginEvent.data);
    });
  }

  /**
   * Listen to namespaced events once
   */
  once(event: string, listener: (...args: any[]) => void): void {
    const namespacedEvent = `${this.namespace}:${event}`;
    this.parentEmitter.once(namespacedEvent, (pluginEvent: PluginEvent) => {
      listener(...pluginEvent.data);
    });
  }

  /**
   * Remove listener
   */
  off(event: string, listener: (...args: any[]) => void): void {
    const namespacedEvent = `${this.namespace}:${event}`;
    this.parentEmitter.off(namespacedEvent, listener);
  }

  /**
   * Listen to all events in this namespace
   */
  onAny(listener: (event: string, ...args: any[]) => void): void {
    this.parentEmitter.on('*', (pluginEvent: PluginEvent) => {
      if (pluginEvent.type.startsWith(`${this.namespace}:`)) {
        const eventName = pluginEvent.type.substring(this.namespace.length + 1);
        listener(eventName, ...pluginEvent.data);
      }
    });
  }
}