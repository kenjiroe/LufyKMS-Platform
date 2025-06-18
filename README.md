# LufyKMS-Platform

Multi-platform Knowledge Management System with AI chatbot plugins

## 🎯 Overview

LufyKMS-Platform is a comprehensive knowledge management ecosystem designed to integrate AI chatbots across multiple platforms. Built with a plugin-based architecture for maximum flexibility and scalability.

**Migrated from [LINE-Chatbot-x-Gemini-Multimodal](https://github.com/jirawatee/LINE-Chatbot-x-Gemini-Multimodal)** - Now with improved architecture, TypeScript support, and plugin framework.

## ✨ Features

🧠 **Core KMS Engine**
- Vector similarity search with Google AI embeddings
- Intelligent document chunking and storage
- Multi-provider architecture (Firestore, others)
- Advanced caching and performance optimization

🔌 **Plugin Framework**
- Event-driven plugin system
- Lifecycle management (init, start, stop, destroy)
- Type-safe interfaces with TypeScript
- Built-in metrics and monitoring

📱 **LINE Chatbot Plugin** 
- Complete LINE Bot integration
- Rich menu support with fallback options
- Admin command system
- File upload and processing
- Conversation memory management

## 🏗️ Architecture

```
LufyKMS-Platform/
├── packages/
│   ├── core/                 # Core KMS engine
│   │   ├── storage/          # Storage providers (Firestore, etc.)
│   │   ├── embeddings/       # Embedding providers (Google AI, etc.)
│   │   ├── search/           # Search providers (Vector, etc.)
│   │   └── utils/            # Text processing utilities
│   ├── plugins/              # Plugin framework
│   │   ├── base/             # Base plugin classes
│   │   ├── events/           # Event system
│   │   └── line-chatbot/     # LINE Bot implementation
│   ├── web-portal/           # Web interface (planned)
│   └── api/                  # REST API (planned)
├── examples/                 # Usage examples
└── docs/                     # Documentation
```

## 📦 Packages

- **@lufykms/core** - Core KMS engine with vector search, embeddings, and storage
- **@lufykms/plugins** - Plugin framework with LINE Bot implementation

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/kenjiroe/LufyKMS-Platform.git
cd LufyKMS-Platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Packages

```bash
npm run build
```

### 4. Set Up Environment

```bash
cd examples
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 5. Run LINE Bot Example

```bash
cd examples
npm install
npm run line-bot
```

## 🔧 Configuration

### Required Environment Variables

```bash
# Google AI API Key (for embeddings)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_ADMIN_USERS=user_id_1,user_id_2

# Firebase (for Firestore)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

## 💡 Usage Examples

### Basic KMS Usage

```typescript
import { 
  KnowledgeManagementSystem,
  FirestoreStorageProvider,
  GoogleEmbeddingProvider,
  VectorSearchProvider
} from '@lufykms/core';

// Initialize providers
const storage = new FirestoreStorageProvider();
const embedding = new GoogleEmbeddingProvider(apiKey, config, cache);
const search = new VectorSearchProvider(storage, embedding);

// Create KMS instance
const kms = new KnowledgeManagementSystem(storage, embedding, search);

// Add document
const docId = await kms.addDocument('Your document content', {
  fileName: 'example.txt',
  source: 'manual'
});

// Search documents
const results = await kms.search('your query', { limit: 5 });
```

### LINE Bot Plugin

```typescript
import { PluginManager, LineChatbotPlugin } from '@lufykms/plugins';

// Create plugin manager
const pluginManager = new PluginManager(kms);

// Create LINE plugin
const linePlugin = new LineChatbotPlugin({
  name: 'line-chatbot',
  version: '1.0.0',
  enabled: true,
  settings: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    adminUsers: ['your_line_user_id']
  }
});

// Register and start
await pluginManager.registerPlugin(linePlugin);
await pluginManager.startPlugin('line-chatbot');
```

## 🔌 Plugin Development

Create custom plugins by extending the `BasePlugin` class:

```typescript
import { BasePlugin, PluginContext, IncomingMessage, OutgoingMessage } from '@lufykms/plugins';

class MyCustomPlugin extends BasePlugin {
  protected async onInit(context: PluginContext): Promise<void> {
    this.log.info('Plugin initialized');
  }

  protected async onStart(context: PluginContext): Promise<void> {
    this.log.info('Plugin started');
  }

  async handleMessage(message: IncomingMessage): Promise<OutgoingMessage[]> {
    return [{
      type: 'text',
      content: `Echo: ${message.content}`
    }];
  }
}
```

## 🛠️ Development

```bash
# Build all packages
npm run build

# Watch mode
npm run dev

# Run tests
npm run test

# Clean build artifacts
npm run clean
```

## 📚 Documentation

- [Core KMS API](/packages/core/README.md)
- [Plugin Framework](/packages/plugins/README.md)
- [LINE Bot Plugin Guide](/docs/line-bot-setup.md)
- [Migration from LINE-Chatbot-x-Gemini-Multimodal](/docs/migration.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Migrated and improved from the original [LINE-Chatbot-x-Gemini-Multimodal](https://github.com/jirawatee/LINE-Chatbot-x-Gemini-Multimodal) by [@jirawatee](https://github.com/jirawatee)
- Built with Google AI, Firebase, and LINE Messaging API
- Inspired by modern plugin architectures and microservices patterns