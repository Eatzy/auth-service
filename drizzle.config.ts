import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Read CA cert from environment variable
const caCert = process.env.DB_CA_CERT;

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number.parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl:
      caCert !== undefined
        ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED, // recommend `true` for production
            ca: caCert,
          }
        : undefined, // if no cert, use regular connection
  },
  migrations: {
    table: '__drizzle_migrations', // `__drizzle_migrations` by default
    schema: 'public', // used in PostgreSQL only, `drizzle` by default
  },
});
