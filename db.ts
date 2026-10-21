import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UserProfile, AnalysisHistoryItem } from '../types';

export interface StoredUser extends UserProfile {
  salt: string;
  passwordHash: string;
}

export interface UserSettings {
  defaultLanguage: string;
  defaultExplanationLanguage: string;
  autoAudioNarration: boolean;
  theme: 'dark' | 'light' | 'system';
  speechRate: number;
  autoFixOnScan: boolean;
}

const DB_DIR = path.join(process.cwd(), 'data', 'db');

function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDbDirectory();
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error creating file ${filePath}`, e);
    }
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filename}, returning default:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureDbDirectory();
  const filePath = path.join(DB_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing to ${filename}:`, err);
  }
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function createSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateToken(): string {
  return 'jwt_sec_' + crypto.randomBytes(24).toString('hex');
}

// User Database Management
export class UserDatabase {
  private users: Map<string, StoredUser> = new Map();

  constructor() {
    this.loadUsers();
  }

  private loadUsers() {
    const data = readJsonFile<Record<string, StoredUser>>('users.json', {});
    this.users = new Map(Object.entries(data));

    // Initialize demo users if database is empty
    if (this.users.size === 0) {
      this.initDefaultUsers();
    }
  }

  private persist() {
    const obj: Record<string, StoredUser> = {};
    for (const [k, v] of this.users.entries()) {
      obj[k] = v;
    }
    writeJsonFile('users.json', obj);
  }

  private initDefaultUsers() {
    const demoUsersData = [
      {
        id: 'user-samruddhi',
        name: 'Samruddhi Patil',
        email: 'samruddhipatil1116@gmail.com',
        password: 'securityMaster2026!',
        role: 'Lead Security Architect' as const,
        organization: 'CloudSec Global Labs',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        plan: 'Enterprise Pro AI' as const,
        stats: { scansCount: 428, bugsResolved: 1290, hoursSaved: 384 },
      },
      {
        id: 'user-alex',
        name: 'Alex Chen',
        email: 'alex.chen@scaleops.io',
        password: 'scaleOps2026!',
        role: 'Senior Staff Engineer' as const,
        organization: 'ScaleOps Distributed Systems',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        plan: 'Enterprise Pro AI' as const,
        stats: { scansCount: 265, bugsResolved: 742, hoursSaved: 215 },
      },
      {
        id: 'user-elena',
        name: 'Elena Rostova',
        email: 'elena.r@devquality.net',
        password: 'devQuality2026!',
        role: 'QA Automation Lead' as const,
        organization: 'DevQuality Assurance',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        plan: 'Developer Cloud' as const,
        stats: { scansCount: 189, bugsResolved: 512, hoursSaved: 160 },
      },
      {
        id: 'user-guest',
        name: 'Guest Developer',
        email: 'guest.developer@sandbox.local',
        password: 'guestPass2026!',
        role: 'Guest Developer' as const,
        organization: 'Sandbox Workspace',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        plan: 'Community Open' as const,
        stats: { scansCount: 14, bugsResolved: 32, hoursSaved: 12 },
      },
    ];

    for (const item of demoUsersData) {
      const salt = createSalt();
      const passwordHash = hashPassword(item.password, salt);
      this.users.set(item.email.toLowerCase(), {
        id: item.id,
        name: item.name,
        email: item.email,
        role: item.role,
        organization: item.organization,
        avatarUrl: item.avatarUrl,
        plan: item.plan,
        token: 'sec_tok_' + crypto.randomBytes(8).toString('hex'),
        joinedAt: '2025-01-15',
        salt,
        passwordHash,
        stats: item.stats,
      });
    }

    this.persist();
  }

  public getUserByEmail(email: string): StoredUser | undefined {
    const normalized = email.toLowerCase().trim();
    let user = this.users.get(normalized);
    if (!user) {
      this.loadUsers();
      user = this.users.get(normalized);
    }
    return user;
  }

  public getUserByToken(token: string): StoredUser | undefined {
    for (const user of this.users.values()) {
      if (user.token === token) {
        return user;
      }
    }
    this.loadUsers();
    for (const user of this.users.values()) {
      if (user.token === token) {
        return user;
      }
    }

    // Support demo personas with dynamic session tokens
    if (token.startsWith('sec_tok_')) {
      const user = this.getUserByEmail('samruddhipatil1116@gmail.com');
      if (user) {
        user.token = token;
        return user;
      }
    }
    if (token.startsWith('dev_tok_')) {
      const user = this.getUserByEmail('alex.chen@scaleops.io');
      if (user) {
        user.token = token;
        return user;
      }
    }
    if (token.startsWith('qa_tok_')) {
      const user = this.getUserByEmail('elena.r@devquality.net');
      if (user) {
        user.token = token;
        return user;
      }
    }
    if (token.startsWith('guest_tok_')) {
      const user = this.getUserByEmail('guest.developer@sandbox.local');
      if (user) {
        user.token = token;
        return user;
      }
    }

    return undefined;
  }

  public getUserById(userId: string): StoredUser | undefined {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    this.loadUsers();
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return undefined;
  }

  public createUser(user: StoredUser): void {
    this.loadUsers();
    this.users.set(user.email.toLowerCase().trim(), user);
    this.persist();
  }

  public updateUser(user: StoredUser): void {
    this.users.set(user.email.toLowerCase().trim(), user);
    this.persist();
  }

  public updatePassword(email: string, newPasswordPlain: string): boolean {
    const user = this.getUserByEmail(email);
    if (!user) return false;
    const newSalt = createSalt();
    const newHash = hashPassword(newPasswordPlain, newSalt);
    user.salt = newSalt;
    user.passwordHash = newHash;
    user.token = ''; // Invalidate prior session tokens so new login is required
    this.updateUser(user);
    return true;
  }
}

// Password Reset Record Interface and Store
export interface PasswordResetRecord {
  email: string;
  token: string;
  code: string;
  expiresAt: number;
  used: boolean;
  createdAt: number;
}

export class PasswordResetDatabase {
  private resets: Map<string, PasswordResetRecord> = new Map();

  constructor() {
    this.loadResets();
  }

  private loadResets() {
    const data = readJsonFile<Record<string, PasswordResetRecord>>('password_resets.json', {});
    this.resets = new Map(Object.entries(data));
  }

  private persist() {
    const obj: Record<string, PasswordResetRecord> = {};
    for (const [k, v] of this.resets.entries()) {
      obj[k] = v;
    }
    writeJsonFile('password_resets.json', obj);
  }

  public createResetRequest(email: string): PasswordResetRecord {
    const normalizedEmail = email.toLowerCase().trim();
    // 6-digit numeric verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Secure hex token
    const token = 'rst_' + crypto.randomBytes(20).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity
    const record: PasswordResetRecord = {
      email: normalizedEmail,
      token,
      code,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    };
    this.resets.set(token, record);
    this.persist();
    return record;
  }

  public findValidReset(email: string, tokenOrCode: string): PasswordResetRecord | undefined {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanInput = tokenOrCode.trim();
    const now = Date.now();

    for (const record of this.resets.values()) {
      if (
        record.email === normalizedEmail &&
        !record.used &&
        record.expiresAt > now &&
        (record.token === cleanInput || record.code === cleanInput)
      ) {
        return record;
      }
    }
    return undefined;
  }

  public markAsUsed(token: string): void {
    const record = this.resets.get(token);
    if (record) {
      record.used = true;
      this.persist();
    }
  }
}

// User-Isolated History Store
export class HistoryDatabase {
  private historyMap: Map<string, AnalysisHistoryItem[]> = new Map();

  constructor() {
    this.loadHistory();
  }

  private loadHistory() {
    const data = readJsonFile<Record<string, AnalysisHistoryItem[]>>('history.json', {});
    this.historyMap = new Map(Object.entries(data));
  }

  private persist() {
    const obj: Record<string, AnalysisHistoryItem[]> = {};
    for (const [k, v] of this.historyMap.entries()) {
      obj[k] = v;
    }
    writeJsonFile('history.json', obj);
  }

  public getHistoryForUser(userId: string): AnalysisHistoryItem[] {
    return this.historyMap.get(userId) || [];
  }

  public addHistoryItem(userId: string, item: AnalysisHistoryItem): void {
    const list = this.historyMap.get(userId) || [];
    // Keep last 100 scans per user
    const updated = [item, ...list.slice(0, 99)];
    this.historyMap.set(userId, updated);
    this.persist();
  }

  public deleteHistoryItem(userId: string, itemId: string): boolean {
    const list = this.historyMap.get(userId) || [];
    const filtered = list.filter((item) => item.id !== itemId);
    if (filtered.length !== list.length) {
      this.historyMap.set(userId, filtered);
      this.persist();
      return true;
    }
    return false;
  }

  public clearHistoryForUser(userId: string): void {
    this.historyMap.set(userId, []);
    this.persist();
  }
}

// User-Isolated Settings Store
export class SettingsDatabase {
  private settingsMap: Map<string, UserSettings> = new Map();

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const data = readJsonFile<Record<string, UserSettings>>('settings.json', {});
    this.settingsMap = new Map(Object.entries(data));
  }

  private persist() {
    const obj: Record<string, UserSettings> = {};
    for (const [k, v] of this.settingsMap.entries()) {
      obj[k] = v;
    }
    writeJsonFile('settings.json', obj);
  }

  public getSettings(userId: string): UserSettings {
    const existing = this.settingsMap.get(userId);
    if (existing) return existing;
    const defaultSettings: UserSettings = {
      defaultLanguage: 'python',
      defaultExplanationLanguage: 'en',
      autoAudioNarration: false,
      theme: 'dark',
      speechRate: 1.0,
      autoFixOnScan: false,
    };
    this.settingsMap.set(userId, defaultSettings);
    this.persist();
    return defaultSettings;
  }

  public updateSettings(userId: string, updates: Partial<UserSettings>): UserSettings {
    const current = this.getSettings(userId);
    const updated = { ...current, ...updates };
    this.settingsMap.set(userId, updated);
    this.persist();
    return updated;
  }
}

export const userDb = new UserDatabase();
export const historyDb = new HistoryDatabase();
export const settingsDb = new SettingsDatabase();
export const passwordResetDb = new PasswordResetDatabase();
