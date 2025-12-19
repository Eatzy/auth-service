import { Hono } from 'hono';
import { env } from '../config/env';
import { eatzyUserCheck } from '../services/eatzy-user-check';

const debugApp = new Hono();

/**
 * Helper function to detect if we're in development environment
 * Based on NODE_ENV, API_SERVICE_URL domain, or BETTER_AUTH_URL
 */
function isDevelopmentEnvironment(): boolean {
  // If NODE_ENV is explicitly development
  if (env.NODE_ENV === 'development') {
    return true;
  }

  // Check BETTER_AUTH_URL for staging detection
  if (env.BETTER_AUTH_URL) {
    try {
      const authUrl = new URL(env.BETTER_AUTH_URL);
      const authHostname = authUrl.hostname.toLowerCase();

      // If using eatzy.com domain but NOT production, consider it development/staging
      if (
        authHostname.endsWith('.eatzy.com') &&
        authHostname !== 'eatzy-auth.eatzy.com'
      ) {
        return true; // This includes eatzy-auth.intern.eatzy.com (staging)
      }
    } catch (_error) {
      // If URL parsing fails, assume development
      return true;
    }
  }

  // If API_SERVICE_URL doesn't use *.eatzy.com domain, consider it development
  if (env.API_SERVICE_URL) {
    try {
      const url = new URL(env.API_SERVICE_URL);
      const hostname = url.hostname.toLowerCase();

      // If not using eatzy.com domain, consider it development
      if (!hostname.endsWith('.eatzy.com') && hostname !== 'eatzy.com') {
        return true;
      }
    } catch (_error) {
      // If URL parsing fails, assume development
      return true;
    }
  }

  return false;
}

/**
 * Debug Configuration Endpoint
 *
 * Shows sanitized configuration for troubleshooting
 * Only shows non-sensitive info and masked secrets
 */
debugApp.get('/config', (c) => {
  // Only allow in development or with debug header
  const isDebugAllowed =
    isDevelopmentEnvironment() ||
    c.req.header('X-Debug-Token') === env.SERVICES_SECRET_KEY;

  if (!isDebugAllowed) {
    return c.json({ error: 'Debug access denied' }, 403);
  }

  const config = {
    environment: env.NODE_ENV,
    detected_environment: isDevelopmentEnvironment()
      ? 'development'
      : 'production',
    environment_detection: {
      node_env_is_development: env.NODE_ENV === 'development',
      api_url_is_local: env.API_SERVICE_URL
        ? !env.API_SERVICE_URL.includes('.eatzy.com')
        : true,
      auth_url_is_staging: env.BETTER_AUTH_URL
        ? env.BETTER_AUTH_URL.includes('intern.eatzy.com')
        : false,
      auth_url_is_production: env.BETTER_AUTH_URL
        ? env.BETTER_AUTH_URL.includes('eatzy-auth.eatzy.com')
        : false,
      final_is_development: isDevelopmentEnvironment(),
    },
    server: {
      port: env.PORT,
      better_auth_url: env.BETTER_AUTH_URL,
    },
    api_service: {
      url: env.API_SERVICE_URL,
      services_secret_key_set: !!env.SERVICES_SECRET_KEY,
      services_secret_key_length: env.SERVICES_SECRET_KEY?.length || 0,
      services_secret_key_preview: env.SERVICES_SECRET_KEY
        ? isDevelopmentEnvironment()
          ? env.SERVICES_SECRET_KEY
          : `${env.SERVICES_SECRET_KEY.substring(0, 8)}...${env.SERVICES_SECRET_KEY.slice(-4)}`
        : 'NOT_SET',
    },
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      database: env.DB_NAME,
      ssl_enabled: env.DB_SSL,
      ca_cert_set: !!env.DB_CA_CERT,
    },
    auth: {
      better_auth_secret_set: !!env.BETTER_AUTH_SECRET,
      better_auth_secret_length: env.BETTER_AUTH_SECRET?.length || 0,
    },
    social_auth: {
      google_configured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      facebook_configured: !!(
        env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
      ),
      apple_configured: !!(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET),
    },
    timestamp: new Date().toISOString(),
  };

  return c.json(config);
});

/**
 * Test Eatzy API Connection
 *
 * Tests connection to Eatzy API with current configuration
 */
debugApp.post('/test-eatzy-connection', async (c) => {
  // Only allow in development or with debug header
  const isDebugAllowed =
    isDevelopmentEnvironment() ||
    c.req.header('X-Debug-Token') === env.SERVICES_SECRET_KEY;

  if (!isDebugAllowed) {
    return c.json({ error: 'Debug access denied' }, 403);
  }

  const { email } = await c.req
    .json()
    .catch(() => ({ email: 'test@example.com' }));

  try {
    console.log(`🧪 Testing Eatzy API connection with email: ${email}`);

    const startTime = Date.now();
    const result = await eatzyUserCheck.checkUserExists(email);
    const duration = Date.now() - startTime;

    return c.json({
      success: true,
      test_email: email,
      duration_ms: duration,
      api_url: env.API_SERVICE_URL,
      services_secret_preview: env.SERVICES_SECRET_KEY
        ? isDevelopmentEnvironment()
          ? env.SERVICES_SECRET_KEY
          : `${env.SERVICES_SECRET_KEY.substring(0, 8)}...${env.SERVICES_SECRET_KEY.slice(-4)}`
        : 'NOT_SET',
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🧪 Eatzy API test failed:', error);

    return c.json(
      {
        success: false,
        test_email: email,
        api_url: env.API_SERVICE_URL,
        services_secret_preview: env.SERVICES_SECRET_KEY
          ? isDevelopmentEnvironment()
            ? env.SERVICES_SECRET_KEY
            : `${env.SERVICES_SECRET_KEY.substring(0, 8)}...${env.SERVICES_SECRET_KEY.slice(-4)}`
          : 'NOT_SET',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Test Raw API Call
 *
 * Makes a raw API call to test connectivity and authentication
 */
debugApp.post('/test-raw-api', async (c) => {
  // Only allow in development or with debug header
  const isDebugAllowed =
    isDevelopmentEnvironment() ||
    c.req.header('X-Debug-Token') === env.SERVICES_SECRET_KEY;

  if (!isDebugAllowed) {
    return c.json({ error: 'Debug access denied' }, 403);
  }

  const {
    endpoint = '/account/check-user',
    method = 'POST',
    body,
  } = await c.req.json().catch(() => ({}));

  try {
    console.log(`🧪 Testing raw API call: ${method} ${endpoint}`);

    const url = `${env.API_SERVICE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization if services secret key is available
    if (env.SERVICES_SECRET_KEY) {
      headers['Authorization'] = `Bearer ${env.SERVICES_SECRET_KEY}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, requestOptions);
    const duration = Date.now() - startTime;

    let responseData;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return c.json({
      success: response.ok,
      request: {
        url,
        method,
        headers: {
          ...headers,
          Authorization: headers.Authorization
            ? isDevelopmentEnvironment()
              ? headers.Authorization
              : `Bearer ${env.SERVICES_SECRET_KEY?.substring(0, 8)}...`
            : undefined,
        },
        body,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
      },
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('🧪 Raw API test failed:', error);

    return c.json(
      {
        success: false,
        request: {
          url: `${env.API_SERVICE_URL}${endpoint}`,
          method,
          body,
        },
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

/**
 * Environment Variables Check
 *
 * Checks if all required environment variables are set
 */
debugApp.get('/env-check', (c) => {
  // Only allow in development or with debug header
  const isDebugAllowed =
    isDevelopmentEnvironment() ||
    c.req.header('X-Debug-Token') === env.SERVICES_SECRET_KEY;

  if (!isDebugAllowed) {
    return c.json({ error: 'Debug access denied' }, 403);
  }

  const requiredVars = [
    'PORT',
    'NODE_ENV',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'API_SERVICE_URL',
    'SERVICES_SECRET_KEY',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ];

  const optionalVars = [
    'DB_SSL',
    'DB_CA_CERT',
    'DB_SSL_REJECT_UNAUTHORIZED',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'FACEBOOK_CLIENT_ID',
    'FACEBOOK_CLIENT_SECRET',
    'APPLE_CLIENT_ID',
    'APPLE_CLIENT_SECRET',
  ];

  const envCheck = {
    required: {} as Record<
      string,
      { set: boolean; length?: number; preview?: string }
    >,
    optional: {} as Record<
      string,
      { set: boolean; length?: number; preview?: string }
    >,
    missing_required: [] as string[],
    all_required_set: true,
  };

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const isSet = !!value;

    envCheck.required[varName] = {
      set: isSet,
      length: value?.length || 0,
    };

    // Add preview for secret keys
    if (isSet && (varName.includes('SECRET') || varName.includes('PASSWORD'))) {
      if (isDevelopmentEnvironment()) {
        envCheck.required[varName].preview = value;
      } else {
        envCheck.required[varName].preview =
          value!.length > 12
            ? `${value!.substring(0, 8)}...${value!.slice(-4)}`
            : `${value!.substring(0, 4)}...`;
      }
    }

    if (!isSet) {
      envCheck.missing_required.push(varName);
      envCheck.all_required_set = false;
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    const value = process.env[varName];
    const isSet = !!value;

    envCheck.optional[varName] = {
      set: isSet,
      length: value?.length || 0,
    };

    // Add preview for secret keys
    if (isSet && (varName.includes('SECRET') || varName.includes('PASSWORD'))) {
      if (isDevelopmentEnvironment()) {
        envCheck.optional[varName].preview = value;
      } else {
        envCheck.optional[varName].preview =
          value!.length > 12
            ? `${value!.substring(0, 8)}...${value!.slice(-4)}`
            : `${value!.substring(0, 4)}...`;
      }
    }
  }

  return c.json({
    ...envCheck,
    timestamp: new Date().toISOString(),
  });
});

export { debugApp };
