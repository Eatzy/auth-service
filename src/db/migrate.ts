import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../middleware/logger';

async function runMigrations() {
  try {
    logger.info('Running Drizzle database migrations...');

    // Create pool with SSL support (same pattern as auth.ts and kudoz-backend)
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

    await migrate(db, { migrationsFolder: './drizzle' });

    await pool.end();

    logger.info('Drizzle migration completed successfully');
  } catch (error) {
    logger.error('Drizzle migration failed:');
    logger.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

export { runMigrations };
