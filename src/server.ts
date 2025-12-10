import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './config/auth';

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

// Better Auth handler - mount with Hono syntax
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  console.log('Better Auth request received:', c.req.method, c.req.path);
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
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ error: 'Token is required' }, 400);
    }

    console.log('Verifying token:', token);

    // Use Better Auth's internal session verification
    // According to Better Auth docs, we should use the auth instance's internal methods
    try {
      // Better Auth provides access to the database adapter through the auth instance
      const sessionData = await auth.api.getSession({
        headers: new Headers({
          cookie: `better-auth.session_token=${token}`,
        }),
      });

      console.log('Session verification result:', sessionData);

      if (sessionData && sessionData.user) {
        return c.json({
          valid: true,
          user: sessionData.user,
          session: sessionData.session,
        });
      }

      return c.json({ error: 'Invalid or expired token' }, 401);
    } catch (authError) {
      console.log('Better Auth verification error:', authError);
      return c.json({ error: 'Token verification failed' }, 401);
    }
  } catch (error) {
    console.error('Token verification error:', error);
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
