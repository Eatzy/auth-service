import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import { type Configuration, configuration } from '../db/schema';

// Create database connection for config service
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl:
    env.DB_CA_CERT !== ''
      ? {
          rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED,
          ca: env.DB_CA_CERT,
        }
      : env.DB_SSL
        ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED }
        : undefined,
});

const db = drizzle(pool);

export class ConfigService {
  private static cache = new Map<string, string>();
  private static lastCacheUpdate = 0;
  private static readonly CACHE_TTL = 30 * 1000; // 30 seconds (shorter for faster updates)

  // Get configuration value by key
  static async get(
    key: string,
    defaultValue?: string,
  ): Promise<string | undefined> {
    // Check cache first
    if (this.isCacheValid() && this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const result = await db
        .select()
        .from(configuration)
        .where(eq(configuration.key, key))
        .limit(1);

      if (result.length > 0) {
        const value = result[0].value;
        this.cache.set(key, value);
        return value;
      }

      return defaultValue;
    } catch (error) {
      console.error(`Failed to get config ${key}:`, error);
      return defaultValue;
    }
  }

  // Set configuration value
  static async set(
    key: string,
    value: string,
    description?: string,
    category = 'general',
    isSecret = false,
  ): Promise<void> {
    try {
      await db
        .insert(configuration)
        .values({
          id: `config_${key}_${Date.now()}`,
          key,
          value,
          description,
          category,
          isSecret,
        })
        .onConflictDoUpdate({
          target: configuration.key,
          set: {
            value,
            description,
            category,
            isSecret,
            updatedAt: new Date(),
          },
        });

      // Update cache immediately
      this.cache.set(key, value);

      // Broadcast config change to all instances (if needed)
      console.log(`✅ Configuration '${key}' updated and cache refreshed`);
    } catch (error) {
      console.error(`Failed to set config ${key}:`, error);
      throw error;
    }
  }

  // Force refresh cache from database
  static async refreshCache(): Promise<void> {
    await this.loadCache();
  }

  // Clear specific key from cache (forces DB lookup next time)
  static clearCacheKey(key: string): void {
    this.cache.delete(key);
  }

  // Clear entire cache (forces DB lookup for all keys)
  static clearCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  // Get all configurations by category
  static async getByCategory(category: string): Promise<Configuration[]> {
    try {
      return await db
        .select()
        .from(configuration)
        .where(eq(configuration.category, category));
    } catch (error) {
      console.error(`Failed to get configs for category ${category}:`, error);
      return [];
    }
  }

  // Load all configurations into cache
  static async loadCache(): Promise<void> {
    try {
      const configs = await db.select().from(configuration);

      this.cache.clear();
      for (const config of configs) {
        this.cache.set(config.key, config.value);
      }

      this.lastCacheUpdate = Date.now();
      console.log(`✅ Loaded ${configs.length} configurations into cache`);
    } catch (error) {
      console.error('Failed to load configuration cache:', error);
    }
  }

  // Check if cache is still valid
  private static isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_TTL;
  }

  // Initialize default configurations (deprecated - use migrations)
  static async initializeDefaults(): Promise<void> {
    console.log(
      '⚠️  initializeDefaults is deprecated. Configurations are now seeded via migrations.',
    );
    console.log('   Run: bun run db:migrate');
    console.log(
      '   This will automatically populate the configuration table with default values',
    );
  }
}
