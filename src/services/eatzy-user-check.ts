import { env } from '../config/env';

interface EatzyUserCheckResult {
  exists: boolean;
  userData?: {
    id: number;
    email: string;
    username: string;
    firstname: string;
    lastname: string;
    confirmed: boolean;
    active: boolean;
  };
}

interface EatzyApiCheckResponse {
  exists: boolean;
  user?: {
    id: number;
    email: string;
    username: string;
    firstname: string;
    lastname: string;
    confirmed: number;
    active: number;
    created_at: string;
  };
  message?: string;
}

interface EatzyApiAuthResponse {
  access?: {
    token: string;
    expires_in: number;
  };
  refresh?: {
    token: string;
    expires_in: number;
  };
  roles?: Record<string, any>;
  external_id?: number;
}

/**
 * Eatzy User Existence Check Service
 *
 * Checks if user exists in Eatzy database before allowing registration/login
 * This prevents duplicate accounts and ensures existing users can access their data
 */
export class EatzyUserCheckService {
  private apiBaseUrl: string;
  private servicesSecretKey: string;

  constructor() {
    this.apiBaseUrl = env.API_SERVICE_URL || 'http://api.eatsy.local';
    this.servicesSecretKey =
      env.SERVICES_SECRET_KEY || 'local-services-secret-eatzy-2024';
  }

  /**
   * Check if user exists in Eatzy database by email
   * This should be called BEFORE allowing new user registration
   */
  async checkUserExists(email: string): Promise<EatzyUserCheckResult> {
    try {
      console.log(`🔍 Checking if user exists in Eatzy DB: ${email}`);

      // Call Eatzy API to check user existence
      const response = await fetch(`${this.apiBaseUrl}/account/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.servicesSecretKey}`,
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      if (!response.ok) {
        console.log('response', response);
        console.log(`❌ User check API failed: ${response.status}`);
        return { exists: false };
      }

      const data = (await response.json()) as EatzyApiCheckResponse;

      if (data.exists && data.user) {
        console.log(`✅ User exists in Eatzy DB: ${email}`);
        return {
          exists: true,
          userData: {
            id: data.user.id,
            email: data.user.email,
            username: data.user.username,
            firstname: data.user.firstname,
            lastname: data.user.lastname,
            confirmed: data.user.confirmed > 0,
            active: data.user.active > 0,
          },
        };
      }

      console.log(`ℹ️ User does not exist in Eatzy DB: ${email}`);
      return { exists: false };
    } catch (error) {
      console.error('❌ Eatzy user check error:', error);
      // On error, assume user doesn't exist to allow registration
      return { exists: false };
    }
  }

  /**
   * Verify existing user credentials with Eatzy API
   * Used when user exists in Eatzy DB and tries to login
   */
  async verifyExistingUser(
    email: string,
    password: string,
  ): Promise<{
    valid: boolean;
    userData?: any;
  }> {
    try {
      console.log(`🔐 Verifying existing Eatzy user: ${email}`);
      console.log(
        `🔐 Password hash length: ${password.length} chars (should be 32 for MD5)`,
      );

      const response = await fetch(`${this.apiBaseUrl}/account/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email, // Use email as username
          password: password, // Already MD5 hashed from frontend
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(
          `❌ Eatzy user verification failed: ${response.status} - ${errorText}`,
        );
        return { valid: false };
      }

      const data = (await response.json()) as EatzyApiAuthResponse;

      if (data.access && data.access.token) {
        console.log(`✅ Eatzy user verified successfully: ${email}`);
        return {
          valid: true,
          userData: {
            email: email,
            roles: data.roles || {},
            external_id: data.external_id,
            legacy_tokens: {
              access: data.access,
              refresh: data.refresh,
            },
          },
        };
      }

      return { valid: false };
    } catch (error) {
      console.error('❌ Eatzy user verification error:', error);
      return { valid: false };
    }
  }

  /**
   * Create new user in Eatzy database
   * Used when user doesn't exist in Eatzy DB and registers via auth-service
   */
  async createEatzyUser(userData: {
    email: string;
    password: string;
    firstname?: string;
    lastname?: string;
    username?: string;
  }): Promise<{
    created: boolean;
    userData?: any;
    error?: string;
  }> {
    try {
      console.log(`👤 Creating new Eatzy user: ${userData.email}`);

      const response = await fetch(`${this.apiBaseUrl}/account/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.servicesSecretKey}`,
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstname: userData.firstname || '',
          lastname: userData.lastname || '',
          username: userData.username || userData.email,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(
          `❌ Eatzy user creation failed: ${response.status} - ${errorText}`,
        );
        return {
          created: false,
          error: `Failed to create user: ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        created: boolean;
        user?: {
          id: number;
          email: string;
          username: string;
          firstname: string;
          lastname: string;
          confirmed: boolean;
          active: boolean;
          created_at: string;
          source: number;
        };
      };

      if (data.created && data.user) {
        console.log(`✅ Eatzy user created successfully: ${userData.email}`);
        return {
          created: true,
          userData: {
            id: data.user.id,
            email: data.user.email,
            username: data.user.username,
            firstname: data.user.firstname,
            lastname: data.user.lastname,
            confirmed: data.user.confirmed,
            active: data.user.active,
            created_at: data.user.created_at,
            source: data.user.source,
          },
        };
      }

      return {
        created: false,
        error: 'User creation response invalid',
      };
    } catch (error) {
      console.error('❌ Eatzy user creation error:', error);
      return {
        created: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const eatzyUserCheck = new EatzyUserCheckService();
