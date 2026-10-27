/**
 * Credentials System Types
 *
 * Secure storage for API keys, tokens, and OAuth credentials
 * Girru Credentials System
 */

export enum CredentialType {
  API_KEY = 'api_key',
  OAUTH_TOKEN = 'oauth_token',
  PASSWORD = 'password',
  SECRET = 'secret'
}

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;

  // Encrypted data
  encryptedValue: string;
  iv: string;
  authTag: string;

  // Metadata
  description?: string;
  skillId?: string; // Which skill owns this credential
  userId?: string;  // Which user owns this credential

  // OAuth specific
  refreshToken?: string; // Encrypted
  expiresAt?: Date;
  scopes?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}

export interface OAuthCredential extends Credential {
  type: CredentialType.OAUTH_TOKEN;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
  tokenType: 'Bearer' | 'Basic';
}

export interface CreateCredentialRequest {
  name: string;
  type: CredentialType;
  value: string;
  description?: string;
  skillId?: string;
  userId?: string;
}

export interface UpdateCredentialRequest {
  value?: string;
  description?: string;
  expiresAt?: Date;
}

export interface ICredentialStorage {
  save(credential: Credential): Promise<void>;
  get(id: string): Promise<Credential | null>;
  getByName(name: string, userId?: string): Promise<Credential | null>;
  getBySkill(skillId: string): Promise<Credential[]>;
  getByUser(userId: string): Promise<Credential[]>;
  getAll(): Promise<Credential[]>;
  delete(id: string): Promise<void>;
  update(id: string, updates: Partial<Credential>): Promise<void>;

  // Decryption
  decrypt(credential: Credential): Promise<string>;
}

export interface ICredentialManager {
  create(request: CreateCredentialRequest): Promise<Credential>;
  get(id: string): Promise<Credential | null>;
  getValue(id: string): Promise<string>;
  update(id: string, updates: UpdateCredentialRequest): Promise<void>;
  delete(id: string): Promise<void>;

  // OAuth specific
  refreshOAuthToken(id: string): Promise<OAuthCredential>;
  isExpired(credential: OAuthCredential): boolean;
}

export interface IEncryptionService {
  encrypt(plaintext: string): Promise<{
    encrypted: string;
    iv: string;
    authTag: string;
  }>;
  decrypt(encrypted: string, iv: string, authTag: string): Promise<string>;
  hash(value: string): string;
}
