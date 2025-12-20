import 'dotenv/config';
import { serve } from '@hono/node-server';
import { EnhancedEnv } from './config/enhanced-env';
import { env } from './config/env';
import { app } from './server';

const startServer = async () => {
  try {
    console.log(`🚀 Auth Service starting...`);
    console.log(`📖 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 Base URL: ${env.BETTER_AUTH_URL}`);

    // Initialize configuration system
    console.log('🔧 Initializing configuration system...');
    await EnhancedEnv.initialize();

    console.log(`🚀 Auth Service running on port ${env.PORT}`);
    console.log(
      '✅ Configuration system ready - updates will be applied automatically',
    );

    serve({
      fetch: app.fetch,
      port: env.PORT,
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  EnhancedEnv.stopAutoRefresh();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  EnhancedEnv.stopAutoRefresh();
  process.exit(0);
});

startServer();
