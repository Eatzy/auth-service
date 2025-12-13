import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { account, session, user, verification } from '../db/schema';
import { eatzyUserCheck } from '../services/eatzy-user-check';
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
  baseURL: env.BETTER_AUTH_URL, // Read from env - localhost for dev, staging domain for production

  // Database configuration with PostgreSQL
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),

  // Email and password authentication (will use API verification)
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  // Social authentication (handled by auth-service directly)
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
    facebook: {
      clientId: env.FACEBOOK_CLIENT_ID || '',
      clientSecret: env.FACEBOOK_CLIENT_SECRET || '',
      enabled: !!(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET),
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  // Custom hooks for Eatzy integration
  hooks: {
    before: async (ctx: any) => {
      try {
        // Handle signup - check if user exists in Eatzy DB
        if (ctx.path === '/sign-up/email') {
          const { email, password, name } = ctx.body || {};

          if (!email) return;

          console.log(`🔍 Pre-signup check for: ${email}`);

          // Check if user exists in Eatzy database
          const existsResult = await eatzyUserCheck.checkUserExists(email);

          if (existsResult.exists) {
            console.log(`⚠️ User already exists in Eatzy DB: ${email}`);
            throw new Error(
              `User with email ${email} already exists. Please login instead.`,
            );
          }

          console.log(`✅ New user can register: ${email}`);

          // Create user in Eatzy database first
          const nameParts = (name || '').split(' ');
          const firstname = nameParts[0] || '';
          const lastname = nameParts.slice(1).join(' ') || '';

          const createResult = await eatzyUserCheck.createEatzyUser({
            email,
            password,
            firstname,
            lastname,
            username: email,
          });

          if (!createResult.created) {
            console.log(
              `❌ Failed to create user in Eatzy DB: ${createResult.error}`,
            );
            throw new Error(
              `Registration failed: ${createResult.error || 'Unable to create account'}`,
            );
          }

          console.log(`✅ User created in Eatzy DB: ${email}`);

          // Store Eatzy user data for later use
          ctx.eatzyUserData = {
            isNewUser: true,
            userData: createResult.userData,
          };

          return;
        }

        // Handle signin - check and verify with Eatzy
        if (ctx.path === '/sign-in/email') {
          const { email, password } = ctx.body || {};

          if (!email) return;

          console.log(`🔍 Pre-signin check for: ${email}`);
          console.log(
            `🔐 Password format: ${password ? 'MD5 hash (32 chars)' : 'missing'}`,
          );

          // Check if user exists in Eatzy database
          const existsResult = await eatzyUserCheck.checkUserExists(email);

          if (existsResult.exists) {
            console.log(`✅ Existing Eatzy user found: ${email}`);

            // Verify with Eatzy API (password is already MD5 hashed from frontend)
            const verifyResult = await eatzyUserCheck.verifyExistingUser(
              email,
              password,
            );
            console.log('verifyResult:', verifyResult);

            if (!verifyResult.valid) {
              throw new Error('Invalid credentials');
            }

            // Check if user exists in Better Auth database
            const existingUser = await db
              .select()
              .from(user)
              .where(eq(user.email, email))
              .limit(1);

            let userId: string;

            if (existingUser.length === 0) {
              console.log(`🔄 Creating user in Better Auth DB: ${email}`);

              // Create user in Better Auth database
              const userData = verifyResult.userData;
              const firstname = userData?.firstname || '';
              const lastname = userData?.lastname || '';
              const fullName =
                `${firstname} ${lastname}`.trim() || email.split('@')[0];
              userId = crypto.randomUUID();

              // Create user record
              await db.insert(user).values({
                id: userId,
                email: email,
                name: fullName,
                emailVerified: true, // Since they exist in Eatzy, consider them verified
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              console.log(`✅ User created in Better Auth DB: ${email}`);
            } else {
              console.log(`✅ User already exists in Better Auth DB: ${email}`);
              userId = existingUser[0].id;
            }

            // Check if credential account exists for this user
            const existingAccount = await db
              .select()
              .from(account)
              .where(
                and(
                  eq(account.userId, userId),
                  eq(account.providerId, 'credential'),
                ),
              )
              .limit(1);

            if (existingAccount.length === 0) {
              console.log(`🔄 Creating credential account for user: ${email}`);

              // Hash the password using Better Auth's method
              const hashedPassword = await hashPassword(password);

              // Create credential account record for email/password authentication
              await db.insert(account).values({
                id: crypto.randomUUID(),
                accountId: email, // Use email as account identifier
                providerId: 'credential', // Better Auth uses 'credential' for email/password
                userId: userId,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              console.log(`✅ Credential account created for user: ${email}`);
            } else {
              console.log(
                `✅ Credential account exists, checking password format: ${email}`,
              );

              // Check if the existing password hash is in the correct format
              const currentHash = existingAccount[0].password;
              if (currentHash && !currentHash.includes(':')) {
                console.log(
                  `🔄 Updating password hash format for user: ${email}`,
                );

                // Hash the password using Better Auth's method
                const hashedPassword = await hashPassword(password);

                // Update the existing account with the correct hash format
                await db
                  .update(account)
                  .set({
                    password: hashedPassword,
                    updatedAt: new Date(),
                  })
                  .where(eq(account.id, existingAccount[0].id));

                console.log(`✅ Password hash updated for user: ${email}`);
              } else {
                console.log(
                  `✅ Password hash format is correct for user: ${email}`,
                );
              }
            }

            // Store Eatzy data for later use
            ctx.eatzyUserData = {
              isExistingUser: true,
              userData: verifyResult.userData,
            };
          } else {
            console.log(`❌ User not found in Eatzy DB: ${email}`);
            throw new Error('User not found. Please register first.');
          }
          return;
        }

        // Handle social login callbacks
        if (ctx.path?.includes('/callback/')) {
          const email = ctx.user?.email;

          if (!email) return;

          console.log(`🔍 Social login check for: ${email}`);

          // Check if user exists in Eatzy database
          const existsResult = await eatzyUserCheck.checkUserExists(email);

          if (existsResult.exists) {
            console.log(`🔗 Social login for existing Eatzy user: ${email}`);

            // Check if user exists in Better Auth database
            const existingUser = await db
              .select()
              .from(user)
              .where(eq(user.email, email))
              .limit(1);

            if (existingUser.length === 0) {
              console.log(
                `🔄 Creating social user in Better Auth DB: ${email}`,
              );

              // Create user in Better Auth database
              const userData = existsResult.userData;
              const firstname = userData?.firstname || '';
              const lastname = userData?.lastname || '';
              const fullName =
                `${firstname} ${lastname}`.trim() ||
                ctx.user?.name ||
                email.split('@')[0];
              const userId = crypto.randomUUID();

              // Create user record
              await db.insert(user).values({
                id: userId,
                email: email,
                name: fullName,
                emailVerified: true, // Social login emails are typically verified
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              // For social login, Better Auth will handle the account creation automatically
              // We don't need to manually create the account record for social providers

              console.log(`✅ Social user created in Better Auth DB: ${email}`);
            }

            ctx.eatzyUserData = {
              isExistingUser: true,
              userData: existsResult.userData,
            };
          } else {
            console.log(`🆕 New social login user: ${email}`);
            // For new social users, we might want to create them in Eatzy too
            // This depends on your business logic
          }
        }
      } catch (error) {
        console.error('Error in before hook:', error);
        throw error;
      }
    },
  },
});
