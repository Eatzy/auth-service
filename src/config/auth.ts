import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { account, session, user, verification } from '../db/schema';
import { env } from './env';

// Create PostgreSQL connection with SSL support (exactly like kudoz-backend)
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl:
    env.DB_CA_CERT !== ''
      ? {
          rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED,
          ca: env.DB_CA_CERT,
        }
      : env.DB_SSL
        ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED }
        : undefined,
});

const db = drizzle(pool);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL, // Important: Set base URL to avoid redirect_uri_mismatch

  // Trust origins for CORS and cookie handling
  trustedOrigins: [
    ...env.TRUSTED_ORIGINS.split(',').map((origin) => origin.trim()),
    ...env.ALLOWED_DOMAIN_PATTERNS.split(',').map((pattern) => pattern.trim()),
  ],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Session configuration - make it more explicit
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Social providers configuration - Let Better Auth handle redirects naturally
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
  },

  // Disable advanced features that might cause issues
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: false, // Disable for localhost
  },

  // Temporarily disable all hooks to fix OAuth callback issues
  // We'll re-enable Eatzy integration after OAuth is working
  // hooks: {
  //   // Hooks disabled for OAuth debugging
  // },
});
