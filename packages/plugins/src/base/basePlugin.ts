/**
 * Base Plugin Class
 * Foundation for all LufyKMS plugins
 */

import { 
  PluginConfig, 
  PluginContext, 
  PluginLifecycle, 
  PluginMetrics,
  IncomingMessage,
  OutgoingMessage,
  FileUpload,
  Command
} from '../types';

export abstract class BasePlugin implements PluginLifecycle {
  protected config: PluginConfig;
  protected context: PluginContext;
  protected metrics: PluginMetrics;
  protected startTime: number;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor(config: PluginConfig) {
    this.config = config;
    this.metrics = {
      messagesProcessed: 0,
      filesProcessed: 0,
      commandsExecuted: 0,
      errors: 0,
      averageResponseTime: 0,
      uptime: 0
    };
    this.startTime = Date.now();
  }

  /**
   * Get plugin information
   */
  getInfo(): { name: string; version: string; description?: string } {
    return {
      name: this.config.name,
      version: this.config.version,
      description: this.config.description
    };
  }

  /**
   * Get plugin configuration
   */
  getConfig(): PluginConfig {
    return { ...this.config };
  }

  /**
   * Update plugin configuration
   */
  updateConfig(updates: Partial<PluginConfig>): void {
    this.config = { ...this.config, ...updates };
    this.context?.logger?.info(`Plugin ${this.config.name} configuration updated`);
  }

  /**
   * Get plugin metrics
   */
  getMetrics(): PluginMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if plugin is initialized
   */
  isPluginInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if plugin is running
   */
  isPluginRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Initialize plugin (called by plugin manager)
   */
  async initialize(context: PluginContext): Promise<void> {
    if (this.isInitialized) {
      throw new Error(`Plugin ${this.config.name} is already initialized`);
    }

    this.context = context;
    
    try {
      this.context.logger.info(`Initializing plugin: ${this.config.name} v${this.config.version}`);
      
      await this.onInit?.(context);
      
      this.isInitialized = true;
      this.context.logger.info(`Plugin ${this.config.name} initialized successfully`);
      
      // Emit initialization event
      this.context.events.emit('plugin:initialized', {
        plugin: this.config.name,
        version: this.config.version
      });
    } catch (error) {
      this.metrics.errors++;
      this.context.logger.error(`Failed to initialize plugin ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Start plugin (called by plugin manager)
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(`Plugin ${this.config.name} must be initialized before starting`);
    }

    if (this.isRunning) {
      throw new Error(`Plugin ${this.config.name} is already running`);
    }

    if (!this.config.enabled) {
      throw new Error(`Plugin ${this.config.name} is disabled`);
    }

    try {
      this.context.logger.info(`Starting plugin: ${this.config.name}`);
      
      await this.onStart?.(this.context);
      
      this.isRunning = true;
      this.startTime = Date.now();
      this.context.logger.info(`Plugin ${this.config.name} started successfully`);
      
      // Emit start event
      this.context.events.emit('plugin:started', {
        plugin: this.config.name,
        version: this.config.version
      });
    } catch (error) {
      this.metrics.errors++;
      this.context.logger.error(`Failed to start plugin ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Stop plugin (called by plugin manager)
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.context?.logger?.warn(`Plugin ${this.config.name} is not running`);
      return;
    }

    try {
      this.context.logger.info(`Stopping plugin: ${this.config.name}`);
      
      await this.onStop?.(this.context);
      
      this.isRunning = false;
      this.context.logger.info(`Plugin ${this.config.name} stopped successfully`);
      
      // Emit stop event
      this.context.events.emit('plugin:stopped', {
        plugin: this.config.name,
        version: this.config.version
      });
    } catch (error) {
      this.metrics.errors++;
      this.context.logger.error(`Failed to stop plugin ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Destroy plugin (called by plugin manager)
   */
  async destroy(): Promise<void> {
    try {
      if (this.isRunning) {
        await this.stop();
      }

      this.context?.logger?.info(`Destroying plugin: ${this.config.name}`);
      
      await this.onDestroy?.(this.context);
      
      this.isInitialized = false;
      this.context?.logger?.info(`Plugin ${this.config.name} destroyed successfully`);
      
      // Emit destroy event
      this.context?.events?.emit('plugin:destroyed', {
        plugin: this.config.name,
        version: this.config.version
      });
    } catch (error) {
      this.metrics.errors++;
      this.context?.logger?.error(`Failed to destroy plugin ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Process incoming message (should be overridden by message plugins)
   */
  async processMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    if (!this.isRunning) {
      throw new Error(`Plugin ${this.config.name} is not running`);
    }

    const startTime = Date.now();
    
    try {
      this.context.logger.debug(`Processing message from ${message.userId} in ${this.config.name}`);
      
      const responses = await this.handleMessage?.(message) || [];
      
      this.metrics.messagesProcessed++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return responses;
    } catch (error) {
      this.metrics.errors++;
      this.context.logger.error(`Error processing message in ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Process file upload (should be overridden by file handling plugins)
   */
  async processFileUpload(file: FileUpload): Promise<OutgoingMessage[]> {
    if (!this.isRunning) {
      throw new Error(`Plugin ${this.config.name} is not running`);
    }

    const startTime = Date.now();
    
    try {
      this.context.logger.debug(`Processing file upload from ${file.userId} in ${this.config.name}`);
      
      const responses = await this.handleFileUpload?.(file) || [];
      
      this.metrics.filesProcessed++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return responses;
    } catch (error) {
      this.metrics.errors++;
      this.context.logger.error(`Error processing file upload in ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Process command (should be overridden by command handling plugins)
   */
  async processCommand(command: Command): Promise<OutgoingMessage[]> {
    if (!this.isRunning) {
      throw new Error(`Plugin ${this.config.name} is not running`);
    }

    const startTime = Date.now();
    
    try {
      this.context.logger.debug(`Processing command ${command.name} from ${command.userId} in ${this.config.name}`);
      
      const responses = await this.handleCommand?.(command) || [];
      
      this.metrics.commandsExecuted++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return responses;
    } catch (error) {
      this.metrics.errors++;
      this.context.logger.error(`Error processing command in ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Plugin lifecycle hooks (to be implemented by concrete plugins)
   */
  protected abstract onInit?(context: PluginContext): Promise<void>;
  protected abstract onStart?(context: PluginContext): Promise<void>;
  protected onStop?(context: PluginContext): Promise<void> {
    // Default implementation - can be overridden
  }
  protected onDestroy?(context: PluginContext): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Message handling (to be implemented by message plugins)
   */
  protected handleMessage?(message: IncomingMessage): Promise<OutgoingMessage[]>;
  protected handleFileUpload?(file: FileUpload): Promise<OutgoingMessage[]>;
  protected handleCommand?(command: Command): Promise<OutgoingMessage[]>;

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalOperations = this.metrics.messagesProcessed + this.metrics.filesProcessed + this.metrics.commandsExecuted;
    if (totalOperations === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (totalOperations - 1) + responseTime) / totalOperations;
    }
  }

  /**
   * Get setting value with default
   */
  protected getSetting<T>(key: string, defaultValue: T): T {
    return this.config.settings[key] !== undefined ? this.config.settings[key] : defaultValue;
  }

  /**
   * Update setting value
   */
  protected setSetting(key: string, value: any): void {
    this.config.settings[key] = value;
  }

  /**
   * Log with plugin context
   */
  protected log = {
    info: (message: string, ...args: any[]) => 
      this.context?.logger?.info(`[${this.config.name}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => 
      this.context?.logger?.warn(`[${this.config.name}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => 
      this.context?.logger?.error(`[${this.config.name}] ${message}`, ...args),
    debug: (message: string, ...args: any[]) => 
      this.context?.logger?.debug(`[${this.config.name}] ${message}`, ...args)
  };
}