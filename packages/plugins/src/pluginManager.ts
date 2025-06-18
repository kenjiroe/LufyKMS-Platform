/**
 * Plugin Manager
 * Manages lifecycle and orchestration of plugins
 */

import { 
  PluginConfig, 
  PluginContext, 
  PluginLogger,
  PluginMetrics,
  IncomingMessage,
  OutgoingMessage,
  FileUpload,
  Command
} from './types';
import { BasePlugin } from './base/basePlugin';
import { PluginEventEmitter } from './events/eventEmitter';
import { KnowledgeManagementSystem } from '@lufykms/core';

export class PluginManager {
  private kms: KnowledgeManagementSystem;
  private plugins: Map<string, BasePlugin> = new Map();
  private eventEmitter: PluginEventEmitter;
  private logger: PluginLogger;
  private isInitialized: boolean = false;

  constructor(kms: KnowledgeManagementSystem, logger?: PluginLogger) {
    this.kms = kms;
    this.eventEmitter = new PluginEventEmitter();
    this.logger = logger || this.createDefaultLogger();
  }

  /**
   * Initialize plugin manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Plugin manager is already initialized');
    }

    this.logger.info('Initializing Plugin Manager...');
    
    // Setup global event listeners
    this.setupGlobalEventListeners();
    
    this.isInitialized = true;
    this.logger.info('Plugin Manager initialized successfully');
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: BasePlugin): Promise<void> {
    const pluginInfo = plugin.getInfo();
    
    if (this.plugins.has(pluginInfo.name)) {
      throw new Error(`Plugin ${pluginInfo.name} is already registered`);
    }

    this.logger.info(`Registering plugin: ${pluginInfo.name} v${pluginInfo.version}`);

    // Create plugin context
    const context: PluginContext = {
      kms: this.kms,
      config: plugin.getConfig(),
      logger: this.createPluginLogger(pluginInfo.name),
      events: this.eventEmitter.createNamespacedEmitter(pluginInfo.name)
    };

    // Initialize plugin
    await plugin.initialize(context);
    
    // Store plugin
    this.plugins.set(pluginInfo.name, plugin);

    this.logger.info(`Plugin ${pluginInfo.name} registered successfully`);
    this.eventEmitter.emitPluginEvent('plugin:registered', 'manager', { 
      plugin: pluginInfo.name, 
      version: pluginInfo.version 
    });
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not registered`);
    }

    this.logger.info(`Unregistering plugin: ${pluginName}`);

    // Stop and destroy plugin
    if (plugin.isPluginRunning()) {
      await plugin.stop();
    }
    
    await plugin.destroy();

    // Remove from registry
    this.plugins.delete(pluginName);

    this.logger.info(`Plugin ${pluginName} unregistered successfully`);
    this.eventEmitter.emitPluginEvent('plugin:unregistered', 'manager', { 
      plugin: pluginName 
    });
  }

  /**
   * Start a plugin
   */
  async startPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not registered`);
    }

    this.logger.info(`Starting plugin: ${pluginName}`);
    await plugin.start();
    this.logger.info(`Plugin ${pluginName} started successfully`);
  }

  /**
   * Stop a plugin
   */
  async stopPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not registered`);
    }

    this.logger.info(`Stopping plugin: ${pluginName}`);
    await plugin.stop();
    this.logger.info(`Plugin ${pluginName} stopped successfully`);
  }

  /**
   * Start all enabled plugins
   */
  async startAllPlugins(): Promise<void> {
    this.logger.info('Starting all enabled plugins...');

    const startPromises = Array.from(this.plugins.values())
      .filter(plugin => plugin.getConfig().enabled && !plugin.isPluginRunning())
      .map(async plugin => {
        try {
          await plugin.start();
        } catch (error) {
          this.logger.error(`Failed to start plugin ${plugin.getInfo().name}:`, error);
        }
      });

    await Promise.all(startPromises);
    this.logger.info('All enabled plugins started');
  }

  /**
   * Stop all running plugins
   */
  async stopAllPlugins(): Promise<void> {
    this.logger.info('Stopping all running plugins...');

    const stopPromises = Array.from(this.plugins.values())
      .filter(plugin => plugin.isPluginRunning())
      .map(async plugin => {
        try {
          await plugin.stop();
        } catch (error) {
          this.logger.error(`Failed to stop plugin ${plugin.getInfo().name}:`, error);
        }
      });

    await Promise.all(stopPromises);
    this.logger.info('All plugins stopped');
  }

  /**
   * Process incoming message through all enabled plugins
   */
  async processMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    const responses: OutgoingMessage[] = [];

    for (const plugin of this.plugins.values()) {
      if (!plugin.isPluginRunning() || !plugin.getConfig().enabled) {
        continue;
      }

      try {
        const pluginResponses = await plugin.processMessage(message);
        responses.push(...pluginResponses);
      } catch (error) {
        this.logger.error(`Error processing message in plugin ${plugin.getInfo().name}:`, error);
      }
    }

    return responses;
  }

  /**
   * Process file upload through all enabled plugins
   */
  async processFileUpload(file: FileUpload): Promise<OutgoingMessage[]> {
    const responses: OutgoingMessage[] = [];

    for (const plugin of this.plugins.values()) {
      if (!plugin.isPluginRunning() || !plugin.getConfig().enabled) {
        continue;
      }

      try {
        const pluginResponses = await plugin.processFileUpload(file);
        responses.push(...pluginResponses);
      } catch (error) {
        this.logger.error(`Error processing file upload in plugin ${plugin.getInfo().name}:`, error);
      }
    }

    return responses;
  }

  /**
   * Process command through all enabled plugins
   */
  async processCommand(command: Command): Promise<OutgoingMessage[]> {
    const responses: OutgoingMessage[] = [];

    for (const plugin of this.plugins.values()) {
      if (!plugin.isPluginRunning() || !plugin.getConfig().enabled) {
        continue;
      }

      try {
        const pluginResponses = await plugin.processCommand(command);
        responses.push(...pluginResponses);
      } catch (error) {
        this.logger.error(`Error processing command in plugin ${plugin.getInfo().name}:`, error);
      }
    }

    return responses;
  }

  /**
   * Get plugin by name
   */
  getPlugin(pluginName: string): BasePlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): BasePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin configurations
   */
  getPluginConfigs(): PluginConfig[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.getConfig());
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(pluginName: string, updates: Partial<PluginConfig>): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not registered`);
    }

    const oldConfig = plugin.getConfig();
    plugin.updateConfig(updates);

    this.logger.info(`Updated configuration for plugin: ${pluginName}`);
    this.eventEmitter.emitPluginEvent('plugin:config-updated', 'manager', {
      plugin: pluginName,
      oldConfig,
      newConfig: plugin.getConfig()
    });
  }

  /**
   * Get plugin metrics
   */
  getPluginMetrics(): Record<string, PluginMetrics> {
    const metrics: Record<string, PluginMetrics> = {};
    
    for (const [name, plugin] of this.plugins) {
      metrics[name] = plugin.getMetrics();
    }

    return metrics;
  }

  /**
   * Get manager status
   */
  getStatus(): {
    isInitialized: boolean;
    totalPlugins: number;
    runningPlugins: number;
    enabledPlugins: number;
    eventStats: any;
  } {
    const plugins = Array.from(this.plugins.values());
    
    return {
      isInitialized: this.isInitialized,
      totalPlugins: plugins.length,
      runningPlugins: plugins.filter(p => p.isPluginRunning()).length,
      enabledPlugins: plugins.filter(p => p.getConfig().enabled).length,
      eventStats: this.eventEmitter.getEventStats()
    };
  }

  /**
   * Get event emitter (for external listeners)
   */
  getEventEmitter(): PluginEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Shutdown plugin manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Plugin Manager...');

    // Stop all plugins
    await this.stopAllPlugins();

    // Unregister all plugins
    const pluginNames = Array.from(this.plugins.keys());
    for (const pluginName of pluginNames) {
      await this.unregisterPlugin(pluginName);
    }

    // Clear event history
    this.eventEmitter.clearHistory();

    this.isInitialized = false;
    this.logger.info('Plugin Manager shutdown complete');
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalEventListeners(): void {
    this.eventEmitter.on('plugin:error', (event) => {
      this.logger.error(`Plugin error in ${event.source}:`, event.data);
    });

    this.eventEmitter.on('plugin:warning', (event) => {
      this.logger.warn(`Plugin warning in ${event.source}:`, event.data);
    });
  }

  /**
   * Create plugin-specific logger
   */
  private createPluginLogger(pluginName: string): PluginLogger {
    return {
      info: (message: string, ...args: any[]) => 
        this.logger.info(`[${pluginName}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => 
        this.logger.warn(`[${pluginName}] ${message}`, ...args),
      error: (message: string, ...args: any[]) => 
        this.logger.error(`[${pluginName}] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => 
        this.logger.debug(`[${pluginName}] ${message}`, ...args)
    };
  }

  /**
   * Create default logger if none provided
   */
  private createDefaultLogger(): PluginLogger {
    return {
      info: (message: string, ...args: any[]) => console.log(`[PluginManager] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[PluginManager] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[PluginManager] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => console.debug(`[PluginManager] ${message}`, ...args)
    };
  }
}