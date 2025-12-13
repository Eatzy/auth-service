import { env } from '../config/env';

interface ApiUserResponse {
  success: boolean;
  data?: any;
  user?: {
    id: string;
    email: string;
    username?: string;
    // Add other user fields as needed
  };
}

/**
 * API User Verification Service
 *
 * IMPORTANT: This service is ONLY used for email/password authentication
 * Social logins (Google, Facebook, etc.) are handled directly by Better Auth
 * and do NOT use this API verification.
 *
 * Flow:
 * 1. Email/Password → Auth-Service → API (/account/authorize) → Database lama
 * 2. Social Login → Auth-Service → Social Provider → Auth-Service Database
 */
class ApiUserVerification {
  private apiBaseUrl: string;
  private apiToken: string;

  constructor() {
    this.apiBaseUrl = env.API_SERVICE_URL;
    this.apiToken = env.API_SERVICE_TOKEN;
  }

  /**
   * Verify email/password credentials with existing API
   * Used ONLY for traditional email/password login
   */
  async verifyUser(
    email: string,
    password: string,
  ): Promise<{ valid: boolean; userData?: any }> {
    try {
      console.log(
        `🔍 Verifying email/password with API: ${this.apiBaseUrl}/account/authorize`,
      );

      // Call the existing API's authentication endpoint
      const response = await fetch(`${this.apiBaseUrl}/account/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiToken && { Authorization: `Bearer ${this.apiToken}` }),
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        console.log(`❌ API verification failed: ${response.status}`);
        return { valid: false };
      }

      const data = (await response.json()) as ApiUserResponse;
      const isValid =
        data.success === true ||
        (data.data && Object.keys(data.data).length > 0);

      if (isValid && data.data) {
        // Return full user data from API
        const userData = {
          id: data.data.id || data.data.user_id || email,
          email: email,
          name: data.data.name || data.data.username || email.split('@')[0],
          username: data.data.username || email.split('@')[0],
          // Add any other fields from API response
          ...data.data,
        };

        console.log(`✅ API verification successful with user data`);
        return { valid: true, userData };
      }

      console.log(`❌ API verification failed`);
      return { valid: false };
    } catch (error) {
      console.error('❌ API verification error:', error);
      return { valid: false };
    }
  }

  /**
   * Get user data from API after successful verification
   * Used for email/password authenticated users
   */
  async getUserData(email: string): Promise<ApiUserResponse['user'] | null> {
    try {
      // TODO: Implement real API call to get user profile data
      // For now, we get user data from the /account/authorize response
      // In future, we might need a separate endpoint like /account/profile

      console.log(`📋 Getting user data for: ${email}`);

      // Return basic user structure - real data comes from /account/authorize
      return {
        id: email, // Will be replaced with real ID from API
        email: email,
        username: email.split('@')[0],
      };
    } catch (error) {
      console.error('API user data error:', error);
      return null;
    }
  }

  /**
   * Check if a user exists in the legacy API system
   * Used to determine if we should verify with API or handle as new social user
   */
  async userExistsInLegacySystem(email: string): Promise<boolean> {
    try {
      // This would be a new endpoint to check if user exists without password
      // For now, we assume all users might exist in legacy system
      console.log(`🔍 Checking if user exists in legacy system: ${email}`);
      return true;
    } catch (error) {
      console.error('Legacy user check error:', error);
      return false;
    }
  }
}

export const apiUserVerification = new ApiUserVerification();
