import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './config/auth';
import { docsApp } from './routes/docs';

const app = new Hono();

// CORS middleware
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001',
    ],
    credentials: true,
  }),
);

// Logger middleware
app.use('*', logger());

// Better Auth handler - mount with Hono syntax with custom response handling
app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
  console.log('Better Auth request received:', c.req.method, c.req.path);

  // Handle sign-in and sign-up to extract session token
  if (
    c.req.path.includes('/sign-in/email') ||
    c.req.path.includes('/sign-up/email')
  ) {
    const response = await auth.handler(c.req.raw);

    // If successful, extract the session token from cookies and add to response body
    if (response.status === 200) {
      const setCookieHeader = response.headers.get('set-cookie');
      let sessionToken = null;

      if (setCookieHeader) {
        // Extract session token from set-cookie header
        const cookies = setCookieHeader.split(',');
        for (const cookie of cookies) {
          if (cookie.includes('better-auth.session_token=')) {
            const tokenMatch = cookie.match(
              /better-auth\.session_token=([^;]+)/,
            );
            if (tokenMatch) {
              sessionToken = tokenMatch[1];
              console.log(
                '🍪 Extracted session token from cookie:',
                sessionToken.substring(0, 10) + '...',
              );
              break;
            }
          }
        }
      }

      if (sessionToken) {
        // Parse the original response and add the token
        const originalData = await response.json();

        // Create new response with token included
        const responseData =
          typeof originalData === 'object' && originalData !== null
            ? { ...originalData, token: sessionToken }
            : { token: sessionToken, data: originalData };

        const newResponse = new Response(JSON.stringify(responseData), {
          status: response.status,
          headers: response.headers,
        });

        console.log('✅ Added session token to response for:', c.req.path);
        return newResponse;
      }
    }

    return response;
  }

  // For all other auth endpoints, use default handler
  return auth.handler(c.req.raw);
});

// Health endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Session token verification endpoint for other services
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

// Mount documentation routes
app.route('/', docsApp);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Auth Service API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      verify: '/api/verify',
      swagger: '/swagger',
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Something went wrong!' }, 500);
});

export { app };
