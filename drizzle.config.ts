import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Read environment variables
const dbSsl = process.env.DB_SSL === 'true';
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
    ssl: dbSsl
      ? caCert
        ? {
            rejectUnauthorized:
              process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
            ca: caCert,
          }
        : {
            rejectUnauthorized:
              process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
          }
      : false, // Disable SSL for local development
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
});
