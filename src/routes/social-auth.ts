import { Hono } from 'hono';
import { env } from '../config/env';

const socialAuthApp = new Hono();

/**
 * Get Google OAuth URL
 *
 * Returns the Google OAuth URL that frontend should redirect to
 * Uses Better Auth's standard OAuth flow with dynamic redirect
 *
 * Usage:
 * GET /social-auth/google/url
 * Headers: Origin: http://localhost:5173 (or *.eatzy.com)
 *
 * Response:
 * {
 *   "url": "https://accounts.google.com/o/oauth2/auth?...",
 *   "redirect": true
 * }
 */
socialAuthApp.get('/google/url', async (c) => {
  try {
    console.log('🔗 Generating Google OAuth URL...');

    // Get origin from request headers
    const origin = c.req.header('Origin') || c.req.header('Referer');

    if (!origin) {
      return c.json(
        {
          error: 'Missing Origin header',
          message: 'Origin header is required to determine redirect URL',
        },
        400,
      );
    }

    // Validate origin (security check)
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    // Allow *.eatzy.com domains
    const isEatzyDomain =
      origin.includes('.eatzy.com') || origin === 'https://eatzy.com';
    const isAllowedOrigin = allowedOrigins.includes(origin) || isEatzyDomain;

    if (!isAllowedOrigin) {
      console.log(`❌ Unauthorized origin: ${origin}`);
      return c.json(
        {
          error: 'Unauthorized origin',
          message: `Origin ${origin} is not allowed`,
        },
        403,
      );
    }

    console.log(`✅ Authorized origin: ${origin}`);

    // Generate Google OAuth URL manually to have full control
    const googleAuthUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );

    // Add required parameters
    googleAuthUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set(
      'redirect_uri',
      `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
    );
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');

    // Use a simple state parameter that Better Auth can handle
    // We'll encode the frontend callback in the state
    const frontendCallback = `${origin}/auth/callback`;
    const stateData = {
      redirect: frontendCallback,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');
    googleAuthUrl.searchParams.set('state', state);

    // Add additional parameters for better UX
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    console.log('✅ Google OAuth URL generated successfully');
    console.log(`🔄 Will redirect to: ${frontendCallback} after OAuth`);
    console.log(`🔑 State parameter: ${state}`);

    return c.json({
      url: googleAuthUrl.toString(),
      redirect: true,
    });
  } catch (error) {
    console.error('❌ Error in Google OAuth URL generation:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate Google OAuth URL',
      },
      500,
    );
  }
});

/**
 * Get Facebook OAuth URL (placeholder for future implementation)
 */
socialAuthApp.get('/facebook/url', async (c) => {
  return c.json(
    {
      error: 'Not implemented',
      message: 'Facebook OAuth is not yet configured',
    },
    501,
  );
});

/**
 * Get Apple OAuth URL (placeholder for future implementation)
 */
socialAuthApp.get('/apple/url', async (c) => {
  return c.json(
    {
      error: 'Not implemented',
      message: 'Apple OAuth is not yet configured',
    },
    501,
  );
});

export { socialAuthApp };
