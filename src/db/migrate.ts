import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { env } from '../config/env';
import { logger } from '../middleware/logger';

async function runMigrations() {
  try {
    logger.info('Running Drizzle database migrations...');

    const client = new Client({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    });

    await client.connect();
    const db = drizzle(client);

    await migrate(db, { migrationsFolder: './drizzle' });

    await client.end();

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
