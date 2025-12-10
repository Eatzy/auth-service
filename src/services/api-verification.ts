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

class ApiUserVerification {
  private apiBaseUrl: string;
  private apiToken: string;

  constructor() {
    this.apiBaseUrl = env.API_SERVICE_URL;
    this.apiToken = env.API_SERVICE_TOKEN;
  }

  async verifyUser(email: string, password: string): Promise<boolean> {
    try {
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
        return false;
      }

      const data = (await response.json()) as ApiUserResponse;
      // Check if the response indicates success
      return (
        data.success === true ||
        (data.data && Object.keys(data.data).length > 0)
      );
    } catch (error) {
      console.error('API verification error:', error);
      return false;
    }
  }

  async getUserData(email: string): Promise<ApiUserResponse['user'] | null> {
    try {
      // For now, return a mock user object based on email
      // In a real implementation, you would call the API to get user profile data
      return {
        id: email, // Use email as ID for now
        email: email,
        username: email.split('@')[0], // Extract username from email
      };
    } catch (error) {
      console.error('API user data error:', error);
      return null;
    }
  }
}

export const apiUserVerification = new ApiUserVerification();
