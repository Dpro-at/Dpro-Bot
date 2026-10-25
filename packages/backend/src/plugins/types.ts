/**
 * Plugin System Types
 * Dpro Bot Plugin System
 */

/**
 * Plugin Types
 */
export type PluginType = 'channel' | 'skill' | 'tool' | 'integration' | 'custom';

/**
 * Plugin Status
 */
export type PluginStatus = 'enabled' | 'disabled' | 'error' | 'loading';

/**
 * Plugin Configuration
 */
export interface PluginConfig {
  [key: string]: any;
}

/**
 * Plugin Settings Schema
 */
export interface PluginSettingDefinition {
  key: string;
  type: 'string' | 'secret' | 'number' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
}

/**
 * Plugin Metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  homepage?: string;
  license?: string;

  // Requirements
  requires?: {
    nodeVersion?: string;
    dependencies?: string[];
    binaries?: string[];
  };
}

/**
 * Message Interface
 */
export interface PluginMessage {
  id: string;
  channelId?: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Plugin Interface
 * Base interface that all plugins must implement
 */
export interface Plugin {
  // Metadata
  id: string;
  name: string;
  version: string;
  type: PluginType;
  enabled: boolean;

  // Settings
  config?: PluginConfig;
  settingsSchema?: PluginSettingDefinition[];

  // Extension SDK Hook (for modern extensions)
  register?(api: any): Promise<void>; // ExtensionApi (avoid circular import)

  // Lifecycle Hooks
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
  onEnable?(): Promise<void>;
  onDisable?(): Promise<void>;

  // Event Hooks
  onMessage?(message: PluginMessage): Promise<void>;
  onCommand?(command: string, args: string[]): Promise<any>;

  // Health Check
  getStatus?(): PluginStatus;
  healthCheck?(): Promise<boolean>;
}

/**
 * Plugin Manifest (agent-player.plugin.json)
 */
export interface PluginManifest {
  // Basic Info
  id: string;
  name: string;
  description: string;
  version: string;
  type: PluginType;

  // Author
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;

  // Entry Point
  main: string; // e.g., "dist/index.js"

  // Requirements
  engines?: {
    node?: string;
    npm?: string;
  };

  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;

  // Settings
  settings?: PluginSettingDefinition[];

  // Permissions
  permissions?: string[]; // e.g., ['network', 'filesystem', 'process']

  // Route access for /api/ext/<id> (S0-Q.18). Default: 'owner-admin'.
  routeAccess?: 'owner-admin' | 'authenticated';
  /** Route patterns relative to /api/ext/<id> that skip the access check (e.g. provider webhooks). */
  publicRoutes?: string[];
  /** GET route patterns that may carry the token as ?token= (e.g. EventSource streams). */
  queryTokenRoutes?: string[];

  // Compatibility
  compatibleWith?: string[]; // Other plugin IDs
  conflicts?: string[]; // Conflicting plugin IDs

  // i18n — internationalization (optional)
  i18n?: {
    /** Directory containing locale JSON files (relative to extension root). Default: 'i18n' */
    dir?: string;
    /** Default locale for this extension. Default: 'en' */
    defaultLocale?: string;
    /** List of locales this extension provides */
    supportedLocales?: string[];
  };
}

/**
 * Plugin Registry Interface
 */
export interface IPluginRegistry {
  // Registration
  register(plugin: Plugin): void;
  unregister(pluginId: string): void;

  // Query
  get(pluginId: string): Plugin | undefined;
  getAll(): Plugin[];
  getByType(type: PluginType): Plugin[];
  getEnabled(): Plugin[];

  // Lifecycle
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;

  // Events
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Plugin Loader Interface
 */
export interface IPluginLoader {
  // Load from directory
  loadFromDirectory(dir: string): Promise<Plugin[]>;

  // Load from manifest
  loadFromManifest(manifestPath: string): Promise<Plugin>;

  // Install
  install(source: string): Promise<Plugin>; // source = path or URL

  // Uninstall
  uninstall(pluginId: string): Promise<void>;

  // Validation
  validate(plugin: Plugin): Promise<boolean>;
  validateManifest(manifest: PluginManifest): boolean;
}

/**
 * Plugin Manager Interface
 */
export interface IPluginManager {
  // Initialization
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Plugin Lifecycle
  loadPlugin(pluginId: string): Promise<void>;
  unloadPlugin(pluginId: string): Promise<void>;
  reloadPlugin(pluginId: string): Promise<void>;

  // Enable/Disable
  enablePlugin(pluginId: string): Promise<void>;
  disablePlugin(pluginId: string): Promise<void>;

  // Query
  getPlugin(pluginId: string): Plugin | undefined;
  getAllPlugins(): Plugin[];
  getPluginsByType(type: PluginType): Plugin[];

  // Events
  emit(event: string, ...args: any[]): void;
  on(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Plugin Events
 */
export enum PluginEvent {
  LOADED = 'plugin:loaded',
  UNLOADED = 'plugin:unloaded',
  ENABLED = 'plugin:enabled',
  DISABLED = 'plugin:disabled',
  ERROR = 'plugin:error',
  MESSAGE = 'plugin:message',
  COMMAND = 'plugin:command',
}

/**
 * Plugin Error
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public pluginId: string,
    public code?: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
