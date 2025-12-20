-- Seed default configurations
-- This migration will populate the configuration table with default values
-- These configurations will be used instead of environment variables after seeding

-- API Configuration
INSERT INTO "configuration" ("id", "key", "value", "description", "category", "isSecret", "createdAt", "updatedAt")
VALUES 
  ('config_API_SERVICE_URL_' || extract(epoch from now())::bigint, 'API_SERVICE_URL', 'https://eatzy-auth.intern.eatzy.com', 'Eatzy API base URL for inter-service communication', 'api', false, NOW(), NOW()),
  ('config_SERVICES_SECRET_KEY_' || extract(epoch from now())::bigint, 'SERVICES_SECRET_KEY', 'your-services-secret-key-here', 'Secret key for inter-service communication with Eatzy API', 'api', true, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "isSecret" = EXCLUDED."isSecret",
  "updatedAt" = NOW();

-- CORS Configuration
INSERT INTO "configuration" ("id", "key", "value", "description", "category", "isSecret", "createdAt", "updatedAt")
VALUES 
  ('config_TRUSTED_ORIGINS_' || extract(epoch from now())::bigint, 'TRUSTED_ORIGINS', 'http://localhost:5173,http://localhost:3000,http://localhost:3001', 'Comma-separated list of trusted origins for CORS', 'cors', false, NOW(), NOW()),
  ('config_ALLOWED_DOMAIN_PATTERNS_' || extract(epoch from now())::bigint, 'ALLOWED_DOMAIN_PATTERNS', '.eatsy.net,.eatzy.com,https://eatsy.net,https://eatzy.com', 'Comma-separated list of allowed domain patterns for CORS', 'cors', false, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "isSecret" = EXCLUDED."isSecret",
  "updatedAt" = NOW();

-- Social Auth Configuration - Google
INSERT INTO "configuration" ("id", "key", "value", "description", "category", "isSecret", "createdAt", "updatedAt")
VALUES 
  ('config_GOOGLE_CLIENT_ID_' || extract(epoch from now())::bigint, 'GOOGLE_CLIENT_ID', '', 'Google OAuth 2.0 client ID for social authentication', 'social_auth', false, NOW(), NOW()),
  ('config_GOOGLE_CLIENT_SECRET_' || extract(epoch from now())::bigint, 'GOOGLE_CLIENT_SECRET', '', 'Google OAuth 2.0 client secret for social authentication', 'social_auth', true, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "isSecret" = EXCLUDED."isSecret",
  "updatedAt" = NOW();

-- Social Auth Configuration - Facebook
INSERT INTO "configuration" ("id", "key", "value", "description", "category", "isSecret", "createdAt", "updatedAt")
VALUES 
  ('config_FACEBOOK_CLIENT_ID_' || extract(epoch from now())::bigint, 'FACEBOOK_CLIENT_ID', '', 'Facebook OAuth client ID for social authentication', 'social_auth', false, NOW(), NOW()),
  ('config_FACEBOOK_CLIENT_SECRET_' || extract(epoch from now())::bigint, 'FACEBOOK_CLIENT_SECRET', '', 'Facebook OAuth client secret for social authentication', 'social_auth', true, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "isSecret" = EXCLUDED."isSecret",
  "updatedAt" = NOW();

-- Social Auth Configuration - Apple
INSERT INTO "configuration" ("id", "key", "value", "description", "category", "isSecret", "createdAt", "updatedAt")
VALUES 
  ('config_APPLE_CLIENT_ID_' || extract(epoch from now())::bigint, 'APPLE_CLIENT_ID', '', 'Apple OAuth client ID for social authentication', 'social_auth', false, NOW(), NOW()),
  ('config_APPLE_CLIENT_SECRET_' || extract(epoch from now())::bigint, 'APPLE_CLIENT_SECRET', '', 'Apple OAuth client secret for social authentication', 'social_auth', true, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "isSecret" = EXCLUDED."isSecret",
  "updatedAt" = NOW();

-- Better Auth Configuration (non-secret parts only)
INSERT INTO "configuration" ("id", "key", "value", "description", "category", "isSecret", "createdAt", "updatedAt")
VALUES 
  ('config_BETTER_AUTH_URL_' || extract(epoch from now())::bigint, 'BETTER_AUTH_URL', 'http://localhost:3001', 'Better Auth base URL for OAuth redirects and API calls', 'auth', false, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "isSecret" = EXCLUDED."isSecret",
  "updatedAt" = NOW();