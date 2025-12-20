import { ConfigService } from '../services/config-service';
import { env } from './env';

// Enhanced environment configuration that can fallback to database
export class EnhancedEnv {
  private static initialized = false;
  private static refreshInterval: NodeJS.Timeout | null = null;
  private static readonly REFRESH_INTERVAL = 30 * 1000; // 30 seconds

  // Initialize the enhanced env (load DB configs)
  static async initialize(): Promise<void> {
    try {
      await ConfigService.loadCache();
      this.initialized = true;

      // Start auto-refresh if not already running
      if (!this.refreshInterval) {
        this.startAutoRefresh();
      }

      console.log('✅ Enhanced environment configuration initialized');
    } catch (error) {
      console.error('❌ Failed to initialize enhanced env:', error);
      // Continue with env vars only
      this.initialized = true;
    }
  }

  // Start automatic cache refresh
  private static startAutoRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      try {
        await ConfigService.loadCache();
        console.log('🔄 Configuration cache auto-refreshed');
      } catch (error) {
        console.error('❌ Failed to auto-refresh config cache:', error);
      }
    }, this.REFRESH_INTERVAL);
  }

  // Stop automatic refresh (useful for testing or shutdown)
  static stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Force refresh now
  static async forceRefresh(): Promise<void> {
    await ConfigService.refreshCache();
    console.log('🔄 Configuration cache force-refreshed');
  }

  // Get configuration with DB fallback
  static async get(key: string, envDefault?: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Try to get from database first
    const dbValue = await ConfigService.get(key);
    if (dbValue) {
      return dbValue;
    }

    // Fallback to environment variable
    const envValue = (env as any)[key] || envDefault;
    if (envValue) {
      return envValue;
    }

    throw new Error(
      `Configuration key '${key}' not found in database or environment`,
    );
  }

  // Get configuration synchronously (uses cache)
  static getSync(key: string, envDefault?: string): string {
    // Try cache first (if initialized)
    if (this.initialized) {
      const cached = ConfigService['cache'].get(key);
      if (cached) {
        return cached;
      }
    }

    // Fallback to environment variable
    const envValue = (env as any)[key] || envDefault;
    if (envValue) {
      return envValue;
    }

    throw new Error(
      `Configuration key '${key}' not found in cache or environment`,
    );
  }

  // Convenience methods for common configs
  static async getTrustedOrigins(): Promise<string[]> {
    const origins = await this.get('TRUSTED_ORIGINS', env.TRUSTED_ORIGINS);
    return origins.split(',').map((origin) => origin.trim());
  }

  static async getAllowedDomainPatterns(): Promise<string[]> {
    const patterns = await this.get(
      'ALLOWED_DOMAIN_PATTERNS',
      env.ALLOWED_DOMAIN_PATTERNS,
    );
    return patterns.split(',').map((pattern) => pattern.trim());
  }

  static async getGoogleClientId(): Promise<string> {
    return await this.get('GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID);
  }

  static async getGoogleClientSecret(): Promise<string> {
    return await this.get('GOOGLE_CLIENT_SECRET', env.GOOGLE_CLIENT_SECRET);
  }

  static async getBetterAuthSecret(): Promise<string> {
    return await this.get('BETTER_AUTH_SECRET', env.BETTER_AUTH_SECRET);
  }

  static async getBetterAuthUrl(): Promise<string> {
    return await this.get('BETTER_AUTH_URL', env.BETTER_AUTH_URL);
  }

  static async getApiServiceUrl(): Promise<string> {
    return await this.get('API_SERVICE_URL', env.API_SERVICE_URL);
  }

  // Sync versions for performance-critical paths
  static getTrustedOriginsSync(): string[] {
    const origins = this.getSync('TRUSTED_ORIGINS', env.TRUSTED_ORIGINS);
    return origins.split(',').map((origin) => origin.trim());
  }

  static getAllowedDomainPatternsSync(): string[] {
    const patterns = this.getSync(
      'ALLOWED_DOMAIN_PATTERNS',
      env.ALLOWED_DOMAIN_PATTERNS,
    );
    return patterns.split(',').map((pattern) => pattern.trim());
  }
}
