import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './config/auth';
import { EnhancedEnv } from './config/enhanced-env';
import { env } from './config/env';
import { configApp } from './routes/config';
import { debugApp } from './routes/debug';
import { docsApp } from './routes/docs';
import { socialAuthApp } from './routes/social-auth';

// Helper function to get trusted origins
function getTrustedOrigins(): string[] {
  return EnhancedEnv.getTrustedOriginsSync();
}

// Helper function to check if origin matches allowed domain patterns
function isAllowedDomain(origin: string): boolean {
  const patterns = EnhancedEnv.getAllowedDomainPatternsSync();

  for (const pattern of patterns) {
    // If pattern starts with dot, it's a subdomain pattern (e.g., .eatsy.net)
    if (pattern.startsWith('.')) {
      if (origin.endsWith(pattern)) {
        return true;
      }
    }
    // Otherwise, exact match (e.g., https://eatsy.net)
    else if (origin === pattern) {
      return true;
    }
  }

  return false;
}

const app = new Hono();

// CORS middleware - Use trusted origins from config + env domains + eatsy.net + eatzy.com
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Get trusted origins from config
      const trustedOrigins = getTrustedOrigins();

      // Always allow if no origin (same-origin requests)
      if (!origin) {
        return origin;
      }

      // Check if origin is in trusted origins list
      if (trustedOrigins.includes(origin)) {
        return origin;
      }

      // Allow localhost for development (fallback)
      if (origin.includes('localhost')) {
        return origin;
      }

      // Allow domains from environment variables
      const allowedEnvDomains = [env.BETTER_AUTH_URL, env.API_SERVICE_URL];

      // Check if origin matches any env domain
      for (const envDomain of allowedEnvDomains) {
        try {
          const envUrl = new URL(envDomain);
          if (origin.includes(envUrl.hostname)) {
            return origin;
          }
        } catch (_e) {
          // Skip invalid URLs
        }
      }

      // Allow all configured domain patterns (eatsy.net, eatzy.com, etc.)
      if (isAllowedDomain(origin)) {
        return origin;
      }

      return null; // Reject origin
    },
    credentials: true,
  }),
);

// Logger middleware
app.use('*', logger());

// Better Auth handler - mount with Hono syntax - SIMPLIFIED VERSION
app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
  console.log('Better Auth request received:', c.req.method, c.req.path);

  try {
    // Let Better Auth handle ALL requests naturally without custom logic
    const response = await auth.handler(c.req.raw);

    console.log(`📋 Better Auth response: ${response.status}`);

    // For debugging, log response headers
    if (response.status === 302) {
      console.log(`📋 Redirect location: ${response.headers.get('Location')}`);
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        console.log(`🍪 Set cookies: ${cookies}`);
      }
    }

    return response;
  } catch (error) {
    console.error('Better Auth Handler Error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Authentication failed',
        message:
          error instanceof Error ? error.message : 'Authentication failed',
      },
      500,
    );
  }
});

// Health endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// OAuth code exchange endpoint
app.post('/auth/oauth/google', async (c) => {
  try {
    console.log('🔄 Processing Google OAuth code exchange...');

    const { code, state } = await c.req.json();

    if (!code) {
      console.log('❌ No code provided');
      return c.json({ error: 'Code is required' }, 400);
    }

    console.log(`🔍 Exchanging code: ${code.substring(0, 20)}...`);

    // Use Better Auth's signIn.social method with the code
    try {
      // Create a request that simulates the OAuth callback
      const callbackUrl = `${env.BETTER_AUTH_URL}/api/auth/callback/google?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;

      console.log(`🔄 Processing OAuth callback: ${callbackUrl}`);

      // Create a proper request object for Better Auth
      const mockRequest = new Request(callbackUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; auth-service)',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      // Process with Better Auth
      const authResponse = await auth.handler(mockRequest);

      console.log(`📋 Better Auth response status: ${authResponse.status}`);
      console.log(
        `📋 Better Auth response headers:`,
        Object.fromEntries(authResponse.headers.entries()),
      );

      // Try to read the response body for more info
      const responseClone = authResponse.clone();
      const responseText = await responseClone.text();
      console.log(
        `📋 Better Auth response body: ${responseText.substring(0, 200)}...`,
      );

      if (authResponse.status === 302) {
        // Success - extract cookies
        const cookies = authResponse.headers.get('set-cookie');
        console.log(`🍪 Set-Cookie header: ${cookies}`);

        // Also try to get all cookie-related headers
        const allHeaders = Object.fromEntries(authResponse.headers.entries());
        const cookieHeaders = Object.keys(allHeaders).filter(
          (key) =>
            key.toLowerCase().includes('cookie') ||
            key.toLowerCase().includes('set-cookie'),
        );
        console.log(
          `🍪 All cookie-related headers:`,
          cookieHeaders.map((key) => `${key}: ${allHeaders[key]}`),
        );

        if (cookies) {
          // Extract session token
          const sessionTokenMatch = cookies.match(
            /better-auth\.session_token=([^;]+)/,
          );

          if (sessionTokenMatch) {
            const sessionToken = sessionTokenMatch[1];
            console.log(
              `✅ Session token extracted: ${sessionToken.substring(0, 20)}...`,
            );

            // Verify the session
            const sessionData = await auth.api.getSession({
              headers: new Headers({
                cookie: `better-auth.session_token=${sessionToken}`,
              }),
            });

            if (sessionData && sessionData.user) {
              console.log(
                `✅ OAuth successful for user: ${sessionData.user.email}`,
              );

              // Return success with session data
              const responseData = {
                success: true,
                token: sessionToken,
                user: {
                  id: sessionData.user.id,
                  email: sessionData.user.email,
                  name: sessionData.user.name,
                  emailVerified: sessionData.user.emailVerified,
                },
                session: {
                  id: sessionData.session.id,
                  expiresAt: sessionData.session.expiresAt,
                },
              };

              // Create response with session cookie
              const response = new Response(JSON.stringify(responseData), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Set-Cookie': cookies, // Forward the session cookie
                },
              });

              return response;
            } else {
              console.log('❌ Session verification failed');
              return c.json({ error: 'Session verification failed' }, 500);
            }
          } else {
            console.log('❌ No session token found in cookies');
            return c.json({ error: 'No session token in response' }, 500);
          }
        } else {
          console.log('❌ No cookies in Better Auth response');
          return c.json({ error: 'No cookies in auth response' }, 500);
        }
      } else {
        // Error response from Better Auth
        const errorText = await authResponse.text();
        console.log(
          `❌ Better Auth error (${authResponse.status}): ${errorText}`,
        );

        // Try to parse error message
        let errorMessage = 'OAuth callback failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Keep default message
        }

        return c.json({ error: errorMessage }, authResponse.status as any);
      }
    } catch (authError) {
      console.error('❌ Better Auth processing error:', authError);
      return c.json({ error: 'OAuth processing failed' }, 500 as any);
    }
  } catch (error) {
    console.error('❌ OAuth code exchange error:', error);
    return c.json({ error: 'OAuth exchange failed' }, 500);
  }
});

// Session endpoint for frontend to check authentication status
app.get('/auth/session', async (c) => {
  try {
    console.log('🔍 Checking session for frontend...');

    // Debug: Log all headers
    const headers = Object.fromEntries(c.req.raw.headers.entries());
    console.log('📋 Request headers:', headers);

    // Debug: Log cookies specifically
    const cookieHeader = c.req.header('cookie');
    console.log('🍪 Cookie header:', cookieHeader);

    // Use Better Auth API to get session
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (sessionData && sessionData.user) {
      console.log(`✅ Session found for user: ${sessionData.user.email}`);

      return c.json({
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name,
          emailVerified: sessionData.user.emailVerified,
        },
        session: {
          id: sessionData.session.id,
          expiresAt: sessionData.session.expiresAt,
        },
      });
    }

    console.log('❌ No valid session found');
    return c.json({ error: 'No session found' }, 401);
  } catch (error) {
    console.error('❌ Session check error:', error);
    return c.json({ error: 'Session check failed' }, 500);
  }
});
app.post('/api/verify', async (c) => {
  const startTime = Date.now();

  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ error: 'Token is required' }, 400);
    }

    // PERFORMANCE: Skip URL decoding if not needed (most tokens don't need it)
    const needsDecoding = token.includes('%');
    const decodedToken = needsDecoding ? decodeURIComponent(token) : token;

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Verifying token:', decodedToken.substring(0, 20) + '...');
    }

    // PERFORMANCE: Try direct session lookup first (fastest path)
    const sessionData = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${decodedToken}`,
      }),
    });

    if (sessionData && sessionData.user) {
      const duration = Date.now() - startTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `✅ Session verified in ${duration}ms:`,
          sessionData.user.email,
        );
      }

      // PERFORMANCE: Return minimal user data (faster JSON serialization)
      return c.json({
        valid: true,
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name,
          username:
            sessionData.user.email?.split('@')[0] || sessionData.user.name,
          emailVerified: sessionData.user.emailVerified,
        },
        session: {
          id: sessionData.session.id,
          userId: sessionData.session.userId,
          expiresAt: sessionData.session.expiresAt,
        },
      });
    }

    // PERFORMANCE: Only try fallback if original token was URL-encoded
    if (needsDecoding && token !== decodedToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Trying original token format...');
      }

      const sessionData2 = await auth.api.getSession({
        headers: new Headers({
          cookie: `better-auth.session_token=${token}`,
        }),
      });

      if (sessionData2 && sessionData2.user) {
        const duration = Date.now() - startTime;

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `✅ Session verified (fallback) in ${duration}ms:`,
            sessionData2.user.email,
          );
        }

        return c.json({
          valid: true,
          user: {
            id: sessionData2.user.id,
            email: sessionData2.user.email,
            name: sessionData2.user.name,
            username:
              sessionData2.user.email?.split('@')[0] || sessionData2.user.name,
            emailVerified: sessionData2.user.emailVerified,
          },
          session: {
            id: sessionData2.session.id,
            userId: sessionData2.session.userId,
            expiresAt: sessionData2.session.expiresAt,
          },
        });
      }
    }

    console.log('❌ Session not found or invalid');
    return c.json({ error: 'Invalid or expired token' }, 401);
  } catch (error) {
    console.error('❌ Token verification error:', error);
    return c.json({ error: 'Token verification failed' }, 500);
  }
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Auth Service API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      verify: '/api/verify',
      'oauth-exchange': '/auth/oauth/google (POST - exchange OAuth code)',
      'session-check': '/auth/session (GET - check current session)',
      'social-auth': '/social-auth/* (Google OAuth URL generation)',
      swagger: '/swagger',
      debug: '/debug/* (development only)',
    },
  });
});

// Mount debug routes (only accessible in development or with debug token)
app.route('/debug', debugApp);

// Mount configuration management routes
app.route('/config', configApp);

// Mount social auth routes (Google OAuth URL generation)
app.route('/social-auth', socialAuthApp);

// Mount documentation routes (swagger, openapi.json) - will not override root
app.route('/', docsApp);

// 404 handler
app.notFound((c: any) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err: any, c: any) => {
  console.error('Auth Service Error:', err);

  // Return the actual error message instead of generic message
  const errorMessage = err.message || 'Something went wrong!';

  return c.json(
    {
      error: errorMessage,
      message: errorMessage, // Better Auth expects 'message' field
    },
    500,
  );
});

export { app };
