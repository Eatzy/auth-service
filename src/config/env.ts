import { url, cleanEnv, port, str } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production'],
    default: 'development',
  }),
  PORT: port({ default: 3001 }),
  BETTER_AUTH_SECRET: str(),
  BETTER_AUTH_URL: url({ default: 'http://localhost:3001' }), // Will be eatzy-auth.intern.eatzy.com in staging
  API_SERVICE_URL: url({ default: 'http://api.eatsy.local' }),
  API_SERVICE_TOKEN: str({ default: '' }),
  // Database credentials (same as kudoz-backend)
  DB_HOST: str({ default: 'localhost' }),
  DB_PORT: port({ default: 5432 }),
  DB_USER: str({ default: 'postgres' }),
  DB_PASSWORD: str({ default: 'postgres' }),
  DB_NAME: str({ default: 'auth_service' }),
  DATABASE_URL: str(),
});
