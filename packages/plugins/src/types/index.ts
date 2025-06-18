/**
 * Plugin Framework Types
 */

import { KnowledgeManagementSystem } from '@lufykms/core';

export interface PluginConfig {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  enabled: boolean;
  settings: Record<string, any>;
}

export interface PluginContext {
  kms: KnowledgeManagementSystem;
  config: PluginConfig;
  logger: PluginLogger;
  events: EventEmitter;
}

export interface PluginLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  off(event: string, listener: (...args: any[]) => void): void;
  once(event: string, listener: (...args: any[]) => void): void;
}

export interface PluginLifecycle {
  onInit?(context: PluginContext): Promise<void>;
  onStart?(context: PluginContext): Promise<void>;
  onStop?(context: PluginContext): Promise<void>;
  onDestroy?(context: PluginContext): Promise<void>;
}

export interface MessagePlugin extends PluginLifecycle {
  handleMessage?(message: IncomingMessage, context: PluginContext): Promise<OutgoingMessage[]>;
  handleFileUpload?(file: FileUpload, context: PluginContext): Promise<OutgoingMessage[]>;
  handleCommand?(command: Command, context: PluginContext): Promise<OutgoingMessage[]>;
}

export interface IncomingMessage {
  id: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'sticker' | 'location';
  timestamp: string;
  platform: string;
  metadata?: Record<string, any>;
  replyToken?: string;
  groupId?: string;
  roomId?: string;
}

export interface OutgoingMessage {
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'template' | 'flex' | 'sticker';
  content?: string;
  url?: string;
  data?: any;
  quickReply?: QuickReply;
  template?: MessageTemplate;
}

export interface QuickReply {
  items: QuickReplyItem[];
}

export interface QuickReplyItem {
  type: 'action';
  action: {
    type: 'message' | 'postback' | 'uri';
    label: string;
    text?: string;
    data?: string;
    uri?: string;
  };
}

export interface MessageTemplate {
  type: 'buttons' | 'confirm' | 'carousel' | 'image_carousel';
  text?: string;
  title?: string;
  actions?: TemplateAction[];
  columns?: TemplateColumn[];
}

export interface TemplateAction {
  type: 'message' | 'postback' | 'uri';
  label: string;
  text?: string;
  data?: string;
  uri?: string;
}

export interface TemplateColumn {
  title?: string;
  text?: string;
  thumbnailImageUrl?: string;
  actions?: TemplateAction[];
}

export interface FileUpload {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
  data: Buffer;
  timestamp: string;
  platform: string;
  replyToken?: string;
}

export interface Command {
  name: string;
  userId: string;
  args: string[];
  rawText: string;
  timestamp: string;
  platform: string;
  replyToken?: string;
  isAdmin?: boolean;
}

export interface WebhookEvent {
  type: string;
  source: EventSource;
  timestamp: string;
  replyToken?: string;
  message?: any;
  postback?: any;
  beacon?: any;
  accountLink?: any;
  things?: any;
}

export interface EventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface PlatformAdapter {
  name: string;
  sendMessage(userId: string, messages: OutgoingMessage[]): Promise<void>;
  sendReply(replyToken: string, messages: OutgoingMessage[]): Promise<void>;
  sendPush(userId: string, messages: OutgoingMessage[]): Promise<void>;
  getProfile?(userId: string): Promise<UserProfile>;
  getGroupMembers?(groupId: string): Promise<UserProfile[]>;
  leaveGroup?(groupId: string): Promise<void>;
  leaveRoom?(roomId: string): Promise<void>;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

export interface PluginEvent {
  type: string;
  source: string;
  timestamp: string;
  data: any;
}

export interface PluginMetrics {
  messagesProcessed: number;
  filesProcessed: number;
  commandsExecuted: number;
  errors: number;
  averageResponseTime: number;
  uptime: number;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  main: string;
  types?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  pluginConfig?: {
    platforms?: string[];
    capabilities?: string[];
    permissions?: string[];
    settings?: PluginSetting[];
  };
}

export interface PluginSetting {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}