import fs from "fs/promises";
import path from "path";
import { UserShadowData, Ritual } from "./types";

const STORAGE_FILE = path.join(process.cwd(), "shadow_data.json");

interface StorageSchema {
  users: Record<string, any>;
}

/**
 * Simple JSON-based storage for user shadow data
 */
export class ShadowStorage {
  private static data: Map<string, UserShadowData> = new Map();

  /**
   * Load data from disk
   */
  static async load(): Promise<void> {
    try {
      const content = await fs.readFile(STORAGE_FILE, "utf-8");
      const parsed = JSON.parse(content) as StorageSchema;

      for (const [userId, userData] of Object.entries(parsed.users)) {
        this.data.set(userId, {
          ...userData,
          patterns: new Map(Object.entries(userData.patterns || {})),
        });
      }
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty data
      this.data = new Map();
    }
  }

  /**
   * Save data to disk
   */
  static async save(): Promise<void> {
    const users: Record<string, any> = {};
    for (const [userId, userData] of this.data.entries()) {
      users[userId] = {
        ...userData,
        patterns: Object.fromEntries(userData.patterns),
      };
    }

    const schema: StorageSchema = { users };
    await fs.writeFile(STORAGE_FILE, JSON.stringify(schema, null, 2));
  }

  /**
   * Get or initialize user data
   */
  static getUserData(userId: string): UserShadowData {
    let userData = this.data.get(userId);
    if (!userData) {
      userData = {
        userId,
        isPro: false,
        patterns: new Map(),
        completedRituals: [],
      };
      this.data.set(userId, userData);
    }
    return userData;
  }

  /**
   * Update user data and save
   */
  static async updateUserData(userId: string, updates: Partial<UserShadowData>): Promise<void> {
    const userData = this.getUserData(userId);
    const updated = { ...userData, ...updates };
    this.data.set(userId, updated);
    await this.save();
  }

  /**
   * Track a pattern for a user
   */
  static async trackPattern(userId: string, trait: string): Promise<number> {
    const userData = this.getUserData(userId);
    const count = (userData.patterns.get(trait) || 0) + 1;
    userData.patterns.set(trait, count);
    await this.save();
    return count;
  }
}
