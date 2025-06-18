# LINE Bot Setup Guide

Complete guide to setting up your LINE bot with LufyKMS Platform.

## 📋 Prerequisites

- **Node.js** 18+ 
- **Google AI API Key** (for embeddings)
- **Firebase Project** (for Firestore storage)
- **LINE Developer Account**

## 🚀 Quick Setup

### 1. LINE Developer Console Setup

#### Create LINE Channel
1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new provider or use existing
3. Create a new **Messaging API** channel
4. Note down:
   - **Channel Access Token**
   - **Channel Secret**

#### Configure Webhook
1. In your channel settings, set webhook URL:
   ```
   https://your-domain.com/webhook
   ```
2. Enable **Use webhook**
3. Disable **Auto-reply messages** (optional)
4. Disable **Greeting messages** (optional)

### 2. Get Required API Keys

#### Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Copy the key for environment variables

#### Firebase Setup
1. Create Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database**
3. Create service account key:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Download JSON file

### 3. Environment Configuration

Create `.env` file:

```bash
# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# LINE Bot Configuration  
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here

# Admin Users (LINE User IDs)
LINE_ADMIN_USERS=U1234567890abcdef1234567890abcdef1,U2345678901bcdef2345678901bcdef2

# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json

# Server Configuration
PORT=3000
NODE_ENV=production
```

## 🔧 Installation & Deployment

### Local Development

```bash
# Clone repository
git clone https://github.com/kenjiroe/LufyKMS-Platform.git
cd LufyKMS-Platform

# Install dependencies
npm install

# Build packages
npm run build

# Setup example
cd examples
npm install
cp .env.example .env
# Edit .env with your configuration

# Run locally
npm run line-bot
```

### Production Deployment

#### Option 1: Railway Deployment

1. **Prepare Railway App:**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Set Environment Variables:**
   ```bash
   railway variables:set GOOGLE_AI_API_KEY=your_key
   railway variables:set LINE_CHANNEL_ACCESS_TOKEN=your_token
   railway variables:set LINE_CHANNEL_SECRET=your_secret
   railway variables:set LINE_ADMIN_USERS=your_user_ids
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

#### Option 2: Google Cloud Run

1. **Build Docker Image:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "run", "line-bot"]
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy lufykms-linebot \
     --source . \
     --platform managed \
     --region asia-southeast1 \
     --allow-unauthenticated
   ```

#### Option 3: Firebase Functions

1. **Setup Firebase Functions:**
   ```bash
   npm install -g firebase-tools
   firebase init functions
   ```

2. **Modify functions/index.js:**
   ```javascript
   const functions = require('firebase-functions');
   const app = require('./app'); // Your Express app
   
   exports.webhook = functions.https.onRequest(app);
   ```

3. **Deploy:**
   ```bash
   firebase deploy --only functions
   ```

## 🛠️ Configuration Options

### LINE Bot Settings

```javascript
const linePlugin = new LineChatbotPlugin({
  name: 'line-chatbot',
  version: '1.0.0',
  enabled: true,
  settings: {
    // Required
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    
    // Admin Management
    adminUsers: process.env.LINE_ADMIN_USERS?.split(',') || [],
    
    // Features
    autoSetupRichMenu: true,
    enableConversationMemory: true,
    maxConversationHistory: 10,
    
    // File Processing
    allowFileUploads: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedMimeTypes: [
      'image/jpeg',
      'image/png', 
      'application/pdf',
      'text/plain'
    ],
    
    // Rich Menu
    richMenuConfig: {
      size: { width: 2500, height: 1686 },
      fallbackToSimple: true,
      fallbackToMinimal: true
    }
  }
});
```

### KMS Configuration

```javascript
const kms = new KnowledgeManagementSystem(storage, embedding, search, {
  // Collection name in Firestore
  collection: 'knowledge_base',
  
  // Embedding settings
  embeddingModel: 'text-embedding-004',
  maxCacheSize: 100,
  
  // Search settings  
  searchCacheTTL: 1800, // 30 minutes
  documentCacheTTL: 3600, // 1 hour
  
  // Performance
  maxCharsPerChunk: 8000,
  minSimilarityThreshold: 0.1
});
```

## 📱 LINE Bot Features

### Basic Commands

**User Commands:**
- Send any text → Search knowledge base
- Upload file → Process and optionally save to knowledge base
- `บันทึกลงคลังความรู้` → Save uploaded file to knowledge base

**Admin Commands:**
- `/admin status` → System status
- `/admin docs` → List documents in knowledge base
- `/admin clear knowledge` → Clear all documents
- `/admin stats` → System statistics
- `/admin help` → List all admin commands

### Rich Menu

The bot automatically sets up a rich menu with:
- 🔍 **ค้นหาข้อมูล** → Search knowledge base
- ❓ **คำถามถามบ่อย** → Common questions
- 📚 **วิธีใช้งาน** → Usage instructions
- 📄 **การลงทะเบียนเรียน** → Registration info
- 🎓 **การสำเร็จการศึกษา** → Graduation info  
- 🌐 **เว็บไซต์** → Official website

### File Processing

Supported file types:
- **Images**: JPEG, PNG → Text extraction with OCR
- **Documents**: PDF, TXT → Content extraction
- **Audio**: WAV, MP3 → Speech-to-text (future)
- **Video**: MP4 → Content analysis (future)

## 🔒 Security & Permissions

### Admin User Management

1. **Get Your LINE User ID:**
   - Add your bot as friend
   - Send any message
   - Check server logs for user ID
   - Format: `U1234567890abcdef1234567890abcdef1`

2. **Set Admin Users:**
   ```bash
   # Environment variable
   LINE_ADMIN_USERS=U1234567890abcdef1234567890abcdef1,U2345678901bcdef2345678901bcdef2
   
   # Or programmatically
   adminHandler.addAdmin('U1234567890abcdef1234567890abcdef1');
   ```

### Webhook Security

The bot automatically verifies LINE webhook signatures:
```javascript
// Signature verification happens automatically
if (!lineApiClient.verifySignature(body, signature)) {
  throw new Error('Invalid webhook signature');
}
```

## 📊 Monitoring & Analytics

### Health Check Endpoint

```bash
GET /health
```

Returns:
```json
{
  "kms": {
    "storage": true,
    "embedding": true, 
    "search": true,
    "totalDocuments": 42
  },
  "plugins": {
    "isInitialized": true,
    "totalPlugins": 1,
    "runningPlugins": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Plugin Metrics

```bash
GET /status
```

Returns detailed metrics:
```json
{
  "line": {
    "messagesProcessed": 1250,
    "filesProcessed": 45,
    "commandsExecuted": 23,
    "errors": 2,
    "averageResponseTime": 245,
    "uptime": 86400000
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. **Bot not responding**
```bash
# Check webhook URL in LINE console
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

#### 2. **Rich Menu not showing**
```bash
# Test rich menu permissions
/admin menu check
/admin menu setup
```

#### 3. **File upload fails**
- Check file size (max 10MB)
- Verify supported MIME types
- Ensure admin permissions for file uploads

#### 4. **Knowledge base empty**
```bash
# Check Firestore connection
/admin status

# Import test data
/admin import faq
```

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development
DEBUG=lufykms:*
```

### Log Analysis

Common log patterns:
```bash
# Successful message processing
✅ Message processed for user U1234... in 234ms

# File upload
📁 File uploaded: example.pdf (1.2MB)

# Knowledge base search
🔍 Search query: "registration" → 3 results found

# Admin command
🔧 Admin command: /admin status by U1234...
```

## 📞 Support

Need help? 

1. **Check the logs** for error messages
2. **Test the health endpoint** at `/health`
3. **Verify environment variables** are set correctly
4. **Check LINE webhook configuration**
5. **Open an issue** on GitHub with logs and configuration

---

**Next Steps:**
- [Plugin Development Guide](/packages/plugins/README.md)
- [Core KMS API Reference](/packages/core/README.md)
- [Advanced Configuration](/docs/advanced-config.md)