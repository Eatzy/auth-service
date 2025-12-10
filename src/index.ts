import 'dotenv/config';
import { serve } from '@hono/node-server';
import { env } from './config/env';
import { app } from './server';

const startServer = async () => {
  try {
    console.log(`🚀 Auth Service running on port ${env.PORT}`);
    console.log(`📖 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Base URL: ${env.BETTER_AUTH_URL}`);

    serve({
      fetch: app.fetch,
      port: env.PORT,
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
