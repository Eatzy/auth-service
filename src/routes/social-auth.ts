import { Hono } from 'hono';
import { env } from '../config/env';
import { ConfigService } from '../services/config-service';

const socialAuthApp = new Hono();

/**
 * Check if origin is allowed based on database configuration
 */
async function isOriginAllowed(origin: string): Promise<boolean> {
  try {
    // Get trusted origins from database (fallback to env for development)
    const trustedOriginsConfig = await ConfigService.get(
      'TRUSTED_ORIGINS',
      'http://localhost:5173,http://localhost:3000,http://localhost:3001',
    );

    const allowedOriginsConfig = await ConfigService.get(
      'ALLOWED_DOMAIN_PATTERNS',
      '.eatsy.net,.eatzy.com,https://eatsy.net,https://eatzy.com',
    );

    // Parse trusted origins (exact matches)
    const trustedOrigins = trustedOriginsConfig
      ? trustedOriginsConfig.split(',').map((o) => o.trim())
      : [];

    // Parse allowed domain patterns
    const allowedPatterns = allowedOriginsConfig
      ? allowedOriginsConfig.split(',').map((p) => p.trim())
      : [];

    // Check exact match first
    if (trustedOrigins.includes(origin)) {
      console.log(`✅ Origin allowed (trusted): ${origin}`);
      return true;
    }

    // Check domain patterns
    for (const pattern of allowedPatterns) {
      if (pattern.startsWith('.')) {
        // Domain suffix pattern (e.g., .eatzy.com)
        if (
          origin.includes(pattern) ||
          origin === `https://${pattern.substring(1)}`
        ) {
          console.log(
            `✅ Origin allowed (domain pattern): ${origin} matches ${pattern}`,
          );
          return true;
        }
      } else if (pattern.startsWith('http')) {
        // Full URL pattern
        if (origin === pattern) {
          console.log(`✅ Origin allowed (URL pattern): ${origin}`);
          return true;
        }
      } else {
        // Domain name pattern
        if (origin.includes(pattern)) {
          console.log(
            `✅ Origin allowed (contains pattern): ${origin} contains ${pattern}`,
          );
          return true;
        }
      }
    }

    console.log(`❌ Origin not allowed: ${origin}`);
    console.log(`   Trusted origins: ${trustedOrigins.join(', ')}`);
    console.log(`   Allowed patterns: ${allowedPatterns.join(', ')}`);
    return false;
  } catch (error) {
    console.error('Error checking origin permissions:', error);
    // Fallback to hardcoded list for safety
    const fallbackOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    const isEatzyDomain =
      origin.includes('.eatzy.com') || origin === 'https://eatzy.com';
    return fallbackOrigins.includes(origin) || isEatzyDomain;
  }
}

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

    // Validate origin using database configuration
    const isAllowed = await isOriginAllowed(origin);

    if (!isAllowed) {
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
