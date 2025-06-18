/**
 * Basic LINE Bot Example using LufyKMS Platform
 * This example shows how to set up a simple LINE bot with KMS integration
 */

const { 
  KnowledgeManagementSystem,
  FirestoreStorageProvider,
  GoogleEmbeddingProvider,
  VectorSearchProvider
} = require('@lufykms/core');

const {
  PluginManager,
  LineChatbotPlugin
} = require('@lufykms/plugins');

const express = require('express');
const app = express();

// Enable JSON parsing
app.use(express.json());

// Initialize KMS components
async function initializeKMS() {
  console.log('🚀 Initializing LufyKMS...');

  // Setup storage
  const storage = new FirestoreStorageProvider('knowledge_base');

  // Setup embedding provider
  const embedding = new GoogleEmbeddingProvider(
    process.env.GOOGLE_AI_API_KEY,
    {
      model: 'text-embedding-004',
      maxCharsPerChunk: 8000,
      cacheSize: 100
    },
    new Map() // Simple cache implementation
  );

  // Setup search provider
  const search = new VectorSearchProvider(storage, embedding);

  // Create KMS instance
  const kms = new KnowledgeManagementSystem(storage, embedding, search);

  console.log('✅ LufyKMS initialized successfully');
  return kms;
}

// Initialize plugin system
async function initializePlugins(kms) {
  console.log('🔌 Initializing plugins...');

  // Create plugin manager
  const pluginManager = new PluginManager(kms);
  await pluginManager.initialize();

  // Create LINE bot plugin
  const linePlugin = new LineChatbotPlugin({
    name: 'line-chatbot',
    version: '1.0.0',
    description: 'LINE Chatbot with KMS integration',
    enabled: true,
    settings: {
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
      adminUsers: (process.env.LINE_ADMIN_USERS || '').split(',').filter(Boolean),
      autoSetupRichMenu: true
    }
  });

  // Register and start plugin
  await pluginManager.registerPlugin(linePlugin);
  await pluginManager.startPlugin('line-chatbot');

  console.log('✅ Plugins initialized successfully');
  return { pluginManager, linePlugin };
}

// Main initialization
async function main() {
  try {
    // Check environment variables
    const requiredEnvVars = [
      'GOOGLE_AI_API_KEY',
      'LINE_CHANNEL_ACCESS_TOKEN',
      'LINE_CHANNEL_SECRET'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Initialize systems
    const kms = await initializeKMS();
    const { pluginManager, linePlugin } = await initializePlugins(kms);

    // Setup webhook endpoint
    app.post('/webhook', async (req, res) => {
      try {
        const signature = req.headers['x-line-signature'];
        if (!signature) {
          return res.status(400).send('Missing signature');
        }

        await linePlugin.handleWebhook(req.body, signature);
        res.status(200).send('OK');
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // Health check endpoint
    app.get('/health', async (req, res) => {
      try {
        const health = await kms.getHealthStatus();
        const pluginStatus = pluginManager.getStatus();
        
        res.json({
          kms: health,
          plugins: pluginStatus,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Status endpoint for admins
    app.get('/status', async (req, res) => {
      try {
        const kmsHealth = await kms.getHealthStatus();
        const pluginMetrics = pluginManager.getPluginMetrics();
        const lineStatus = linePlugin.getStatus();

        res.json({
          kms: kmsHealth,
          plugins: pluginMetrics,
          line: lineStatus,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🌐 Server running on port ${port}`);
      console.log(`📡 Webhook URL: http://localhost:${port}/webhook`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log('🎉 LufyKMS LINE Bot is ready!');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down gracefully...');
      await pluginManager.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main();