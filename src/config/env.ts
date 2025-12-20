import { url, bool, cleanEnv, port, str } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production'],
    default: 'development',
  }),
  PORT: port({ default: 3001 }),
  BETTER_AUTH_SECRET: str(),
  BETTER_AUTH_URL: url({ default: 'http://localhost:3001' }), // Will be eatzy-auth.intern.eatzy.com in staging
  API_SERVICE_URL: url({ default: 'http://api.eatsy.local' }), // Eatzy API base URL

  // Database credentials (same as kudoz-backend pattern)
  DB_HOST: str({ default: 'localhost' }),
  DB_PORT: port({ default: 5432 }),
  DB_USER: str({ default: 'postgres' }),
  DB_PASSWORD: str({ default: 'postgres' }),
  DB_NAME: str({ default: 'auth_service' }),

  // SSL Configuration for production
  DB_SSL: bool({ default: false }),
  DB_CA_CERT: str({ default: '' }), // Path to CA certificate file
  DB_SSL_REJECT_UNAUTHORIZED: bool({ default: true }),

  // Social Authentication (optional)
  GOOGLE_CLIENT_ID: str({ default: '' }),
  GOOGLE_CLIENT_SECRET: str({ default: '' }),
  FACEBOOK_CLIENT_ID: str({ default: '' }),
  FACEBOOK_CLIENT_SECRET: str({ default: '' }),
  APPLE_CLIENT_ID: str({ default: '' }),
  APPLE_CLIENT_SECRET: str({ default: '' }),

  // API Integration
  SERVICES_SECRET_KEY: str({ default: 'local-services-secret-eatzy-2024' }),

  // Trusted Origins for CORS (comma-separated)
  TRUSTED_ORIGINS: str({
    default:
      'http://localhost:5173,http://localhost:3000,http://localhost:3001',
  }),

  // Allowed Domain Patterns for CORS (comma-separated)
  ALLOWED_DOMAIN_PATTERNS: str({
    default: '.eatsy.net,.eatzy.com,https://eatsy.net,https://eatzy.com',
  }),
});
