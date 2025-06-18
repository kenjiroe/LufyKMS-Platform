# @lufykms/plugins

Plugin framework and platform integrations for LufyKMS Platform.

## 🎯 Overview

The plugins package provides a comprehensive framework for creating platform-specific integrations with the LufyKMS core. It includes a complete LINE Bot implementation and the foundation for building additional platform plugins.

## ✨ Features

- **Plugin Framework** with lifecycle management
- **Event-driven Architecture** for plugin communication
- **LINE Bot Plugin** with complete Messaging API integration
- **Type-safe Interfaces** with full TypeScript support
- **Built-in Metrics** and monitoring
- **Extensible Design** for custom platforms

## 📦 Installation

```bash
npm install @lufykms/plugins @lufykms/core
```

## 🚀 Quick Start

### Using LINE Bot Plugin

```typescript
import { PluginManager, LineChatbotPlugin } from '@lufykms/plugins';
import { KnowledgeManagementSystem } from '@lufykms/core';

// Initialize KMS (see @lufykms/core docs)
const kms = new KnowledgeManagementSystem(storage, embedding, search);

// Create plugin manager
const pluginManager = new PluginManager(kms);
await pluginManager.initialize();

// Create LINE bot plugin
const linePlugin = new LineChatbotPlugin({
  name: 'line-chatbot',
  version: '1.0.0',
  enabled: true,
  settings: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
    adminUsers: ['U1234567890abcdef1234567890abcdef1'],
    autoSetupRichMenu: true
  }
});

// Register and start plugin
await pluginManager.registerPlugin(linePlugin);
await pluginManager.startPlugin('line-chatbot');

// Handle webhooks
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-line-signature'] as string;
  await linePlugin.handleWebhook(req.body, signature);
  res.status(200).send('OK');
});
```

## 🏗️ Architecture

### Plugin Framework Components

```
@lufykms/plugins/
├── src/
│   ├── types/                # Plugin interfaces
│   ├── base/                 # Base plugin classes
│   ├── events/               # Event system
│   ├── line-chatbot/         # LINE Bot implementation
│   │   ├── lineChatbotPlugin.ts
│   │   ├── lineApiClient.ts
│   │   ├── lineMessageHandler.ts
│   │   ├── lineAdminHandler.ts
│   │   ├── lineRichMenuManager.ts
│   │   └── lineWebhookParser.ts
│   └── pluginManager.ts      # Plugin orchestration
```

### Plugin Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Created   │───▶│ Initialized │───▶│   Started   │───▶│  Destroyed  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                            │                  │
                            ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐
                   │   onInit    │    │   onStop    │
                   └─────────────┘    └─────────────┘
```

## 🔌 Plugin Development

### Creating a Custom Plugin

```typescript
import { BasePlugin, PluginContext, IncomingMessage, OutgoingMessage } from '@lufykms/plugins';

class DiscordChatbotPlugin extends BasePlugin {
  private discordClient: any;

  protected async onInit(context: PluginContext): Promise<void> {
    this.log.info('Initializing Discord plugin...');
    
    // Initialize Discord client
    this.discordClient = new DiscordClient({
      token: this.getSetting('token', '')
    });
    
    // Setup event listeners
    this.discordClient.on('message', this.handleDiscordMessage.bind(this));
  }

  protected async onStart(context: PluginContext): Promise<void> {
    this.log.info('Starting Discord plugin...');
    await this.discordClient.login();
  }

  protected async onStop(context: PluginContext): Promise<void> {
    this.log.info('Stopping Discord plugin...');
    await this.discordClient.destroy();
  }

  async handleMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    if (message.platform !== 'discord') return [];

    // Search knowledge base
    const results = await this.context.kms.search(message.content);
    
    if (results.length === 0) {
      return [{
        type: 'text',
        content: 'No relevant information found.'
      }];
    }

    // Generate response from search results
    const response = this.generateResponse(results);
    
    return [{
      type: 'text',
      content: response
    }];
  }

  private async handleDiscordMessage(discordMsg: any): Promise<void> {
    const message: IncomingMessage = {
      id: discordMsg.id,
      userId: discordMsg.author.id,
      content: discordMsg.content,
      type: 'text',
      timestamp: new Date().toISOString(),
      platform: 'discord',
      metadata: {
        channelId: discordMsg.channel.id,
        guildId: discordMsg.guild?.id
      }
    };

    const responses = await this.handleMessage(message);
    
    for (const response of responses) {
      await discordMsg.reply(response.content);
    }
  }

  private generateResponse(results: any[]): string {
    // Implementation for generating response from search results
    return results.map(r => r.content.substring(0, 200)).join('\n\n');
  }
}

// Usage
const discordPlugin = new DiscordChatbotPlugin({
  name: 'discord-chatbot',
  version: '1.0.0',
  enabled: true,
  settings: {
    token: process.env.DISCORD_BOT_TOKEN
  }
});

await pluginManager.registerPlugin(discordPlugin);
await pluginManager.startPlugin('discord-chatbot');
```

### Plugin Configuration

```typescript
interface PluginConfig {
  name: string;                    // Unique plugin name
  version: string;                 // Plugin version
  description?: string;            // Plugin description
  enabled: boolean;                // Enable/disable plugin
  settings: Record<string, any>;   // Plugin-specific settings
}
```

### Plugin Context

```typescript
interface PluginContext {
  kms: KnowledgeManagementSystem;  // KMS instance
  config: PluginConfig;            // Plugin configuration
  logger: PluginLogger;            // Plugin logger
  events: EventEmitter;            // Event emitter for plugin communication
}
```

## 📱 LINE Bot Plugin

Complete LINE Messaging API integration with advanced features.

### Features

- **Message Processing** with conversation memory
- **File Upload Support** (images, documents, audio, video)
- **Rich Menu Management** with fallback options
- **Admin Command System** with permission controls
- **Webhook Handling** with signature verification
- **Conversation Memory** (10-message history)
- **Cache Management** for files and conversations

### LINE Bot Configuration

```typescript
const lineConfig = {
  name: 'line-chatbot',
  version: '1.0.0',
  enabled: true,
  settings: {
    // Required
    channelAccessToken: 'your_line_access_token',
    channelSecret: 'your_line_channel_secret',
    
    // Admin Management
    adminUsers: ['U1234567890abcdef1234567890abcdef1'],
    
    // Rich Menu
    autoSetupRichMenu: true,
    richMenuFallback: true,
    
    // Features
    enableFileUploads: true,
    enableConversationMemory: true,
    maxConversationHistory: 10,
    
    // File Processing
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: ['image/jpeg', 'image/png', 'application/pdf']
  }
};
```

### Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/admin status` | System status | Shows KMS health, document count |
| `/admin docs` | List documents | Shows documents in knowledge base |
| `/admin clear knowledge` | Clear knowledge base | Removes all documents |
| `/admin stats` | System statistics | Shows usage metrics |
| `/admin help` | Show help | Lists all available commands |

### Message Types

```typescript
// Text messages
{
  type: 'text',
  content: 'Hello, world!'
}

// Images with quick replies
{
  type: 'text',
  content: 'What would you like to do?',
  quickReply: {
    items: [
      {
        type: 'action',
        action: { type: 'message', label: '📚 Save to KB', text: 'save to knowledge base' }
      }
    ]
  }
}

// Rich templates
{
  type: 'template',
  data: { altText: 'Template message' },
  template: {
    type: 'buttons',
    text: 'Choose an option',
    actions: [
      { type: 'message', label: 'Option 1', text: 'option1' }
    ]
  }
}
```

### Rich Menu

Automatic rich menu setup with fallback chain:

1. **Full Menu** (2500x1686) - 6 buttons
2. **Simple Menu** (2500x843) - 2 buttons  
3. **Minimal Menu** (800x270) - 1 button

```typescript
// Manual rich menu management
await linePlugin.setupRichMenu();           // Setup default menu
await linePlugin.clearRichMenus();          // Clear all menus
const connected = await linePlugin.testConnection(); // Test API
```

## 🎯 Event System

Plugin communication through events.

### Event Types

```typescript
// Plugin lifecycle events
pluginManager.getEventEmitter().on('plugin:started', (event) => {
  console.log(`Plugin ${event.data.plugin} started`);
});

// Custom plugin events
const events = context.events; // Namespaced event emitter

// Emit events
events.emit('message:processed', { userId, responseTime: 234 });

// Listen to events
events.on('message:processed', (data) => {
  console.log(`Message processed for ${data.userId} in ${data.responseTime}ms`);
});

// Listen to all events
events.onAny((eventName, data) => {
  console.log(`Event: ${eventName}`, data);
});
```

### Global Events

```typescript
const globalEvents = pluginManager.getEventEmitter();

// Plugin registration
globalEvents.on('plugin:registered', (event) => {
  console.log(`Plugin ${event.data.plugin} registered`);
});

// Plugin errors
globalEvents.on('plugin:error', (event) => {
  console.error(`Plugin ${event.source} error:`, event.data);
});

// System events
globalEvents.on('system:shutdown', () => {
  console.log('System shutting down...');
});
```

## 📊 Monitoring & Metrics

### Plugin Metrics

```typescript
// Get plugin metrics
const metrics = plugin.getMetrics();
console.log({
  messagesProcessed: metrics.messagesProcessed,
  filesProcessed: metrics.filesProcessed,
  commandsExecuted: metrics.commandsExecuted,
  errors: metrics.errors,
  averageResponseTime: metrics.averageResponseTime,
  uptime: metrics.uptime
});

// Get all plugin metrics
const allMetrics = pluginManager.getPluginMetrics();
```

### Plugin Status

```typescript
// Individual plugin status
const status = linePlugin.getStatus();
console.log({
  isRunning: status.isRunning,
  metrics: status.metrics,
  cacheStats: status.cacheStats,
  lineApiStatus: status.lineApiStatus
});

// Plugin manager status
const managerStatus = pluginManager.getStatus();
console.log({
  totalPlugins: managerStatus.totalPlugins,
  runningPlugins: managerStatus.runningPlugins,
  enabledPlugins: managerStatus.enabledPlugins
});
```

## 🔧 Advanced Usage

### Plugin Manager Configuration

```typescript
const pluginManager = new PluginManager(kms, {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[DEBUG] ${msg}`, ...args)
});
```

### Multi-Platform Support

```typescript
// Register multiple platform plugins
const plugins = [
  new LineChatbotPlugin(lineConfig),
  new DiscordChatbotPlugin(discordConfig),
  new SlackChatbotPlugin(slackConfig)
];

for (const plugin of plugins) {
  await pluginManager.registerPlugin(plugin);
}

await pluginManager.startAllPlugins();

// Process messages from any platform
app.post('/webhook/:platform', async (req, res) => {
  const { platform } = req.params;
  
  // Route to appropriate plugin
  const responses = await pluginManager.processMessage({
    id: req.body.id,
    userId: req.body.userId,
    content: req.body.content,
    type: 'text',
    platform,
    timestamp: new Date().toISOString()
  });
  
  res.json({ responses });
});
```

### Plugin Configuration Updates

```typescript
// Update plugin configuration at runtime
await pluginManager.updatePluginConfig('line-chatbot', {
  settings: {
    ...currentSettings,
    enableFileUploads: false,
    maxConversationHistory: 20
  }
});

// Restart plugin with new configuration
await pluginManager.stopPlugin('line-chatbot');
await pluginManager.startPlugin('line-chatbot');
```

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  
  // Stop all plugins
  await pluginManager.stopAllPlugins();
  
  // Shutdown plugin manager
  await pluginManager.shutdown();
  
  process.exit(0);
});
```

## 🧪 Testing

### Plugin Testing

```typescript
import { BasePlugin, PluginContext } from '@lufykms/plugins';

class TestPlugin extends BasePlugin {
  async testMessage(content: string): Promise<string[]> {
    const responses = await this.handleMessage({
      id: 'test',
      userId: 'test-user',
      content,
      type: 'text',
      timestamp: new Date().toISOString(),
      platform: 'test'
    });
    
    return responses.map(r => r.content || '');
  }
}

// Test plugin functionality
const plugin = new TestPlugin(testConfig);
await plugin.initialize(mockContext);
await plugin.start();

const responses = await plugin.testMessage('hello');
expect(responses).toContain('Hello! How can I help you?');
```

### Mock Implementations

```typescript
// Mock plugin context for testing
const mockContext: PluginContext = {
  kms: mockKMS,
  config: testConfig,
  logger: mockLogger,
  events: mockEventEmitter
};

// Mock LINE API client
class MockLineApiClient extends LineApiClient {
  async replyMessage(replyToken: string, messages: any[]): Promise<void> {
    console.log('Mock reply:', messages);
  }
}
```

## 📄 Types Reference

### Core Types

- `PluginConfig` - Plugin configuration
- `PluginContext` - Plugin runtime context
- `IncomingMessage` - Incoming message structure
- `OutgoingMessage` - Outgoing message structure
- `FileUpload` - File upload structure
- `Command` - Command structure

### LINE-Specific Types

- `WebhookEvent` - LINE webhook event
- `UserProfile` - LINE user profile
- `QuickReply` - Quick reply buttons
- `MessageTemplate` - Rich message templates

### Event Types

- `PluginEvent` - Plugin event structure
- `PluginMetrics` - Plugin performance metrics
- `EventEmitter` - Event emitter interface

## 🚀 Deployment

### Production Configuration

```typescript
// Production plugin configuration
const productionConfig = {
  name: 'line-chatbot',
  version: '1.0.0',
  enabled: true,
  settings: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    adminUsers: process.env.LINE_ADMIN_USERS?.split(',') || [],
    
    // Production optimizations
    enableFileUploads: true,
    maxFileSize: 10 * 1024 * 1024,
    enableConversationMemory: true,
    maxConversationHistory: 10,
    
    // Caching
    cacheTimeout: 3600, // 1 hour
    maxCacheSize: 1000,
    
    // Rate limiting
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000
  }
};
```

### Health Checks

```typescript
// Plugin health check endpoint
app.get('/health/plugins', async (req, res) => {
  const status = pluginManager.getStatus();
  const health = {
    healthy: status.runningPlugins === status.enabledPlugins,
    plugins: await Promise.all(
      pluginManager.getAllPlugins().map(async plugin => ({
        name: plugin.getInfo().name,
        running: plugin.isPluginRunning(),
        metrics: plugin.getMetrics()
      }))
    )
  };
  
  res.status(health.healthy ? 200 : 503).json(health);
});
```

## 🤝 Contributing

1. **Follow the plugin interface** for new platform integrations
2. **Add comprehensive tests** for plugin functionality
3. **Document configuration options** and usage examples
4. **Implement proper error handling** and logging
5. **Follow TypeScript best practices**

### Plugin Checklist

- [ ] Extends `BasePlugin` class
- [ ] Implements required lifecycle methods
- [ ] Handles errors gracefully
- [ ] Includes proper logging
- [ ] Provides configuration validation
- [ ] Includes usage documentation
- [ ] Has comprehensive tests

---

**Related Packages:**
- [@lufykms/core](../core) - Core KMS functionality
- [Examples](/examples) - Plugin usage examples