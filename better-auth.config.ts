import { defineConfig } from '@better-auth/cli';
import { auth } from './src/config/auth';

export default defineConfig({
  auth,
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL!,
  },
});
