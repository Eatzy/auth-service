import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const app = new OpenAPIHono();

// Define schemas using zod-openapi
const SignInRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const VerifyTokenRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  username: z.string(),
  emailVerified: z.boolean(),
});

const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
});

const SignInResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  user: UserSchema,
});

const VerifyTokenResponseSchema = z.object({
  valid: z.boolean(),
  user: UserSchema,
  session: SessionSchema,
});

const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  timestamp: z.string(),
});

const RootResponseSchema = z.object({
  message: z.string(),
  version: z.string(),
  endpoints: z.object({
    health: z.string(),
    auth: z.string(),
    verify: z.string(),
    swagger: z.string(),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

// OpenAPI specification
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Eatzy Auth Service API',
    description: `
# 🔐 Eatzy Auth Service

**Unified Authentication Service for All Eatzy Applications**

A centralized JWT-based authentication service that provides secure, scalable authentication for the entire Eatzy ecosystem. This service acts as the single source of truth for user authentication across all applications and services.

## 🌐 Universal Token Support

**One Token, All Services** - JWT tokens issued by this auth-service can be used across:

- **🍽️ Eatzy API** - Main food delivery API
- **🎯 Kudoz App React** - Loyalty & rewards frontend  
- **🏪 Consumer Portal** - Customer web application
- **🔧 Kudoz Backend** - Kudoz backend API service

## 🔑 Authentication Flow

### Email/Password Authentication:
1. **Sign In**: POST /api/auth/sign-in/email with email/password
2. **Get Token**: Receive JWT token in response
3. **Use Token**: Include token in Authorization header for all API calls
4. **Verify Token**: Other services can verify tokens via POST /api/verify

### Social Authentication:
1. **Google Login**: GET /api/auth/google (redirects to Google OAuth)
2. **Facebook Login**: GET /api/auth/facebook (redirects to Facebook OAuth)
3. **Apple Login**: GET /api/auth/apple (redirects to Apple OAuth)
4. **Callback**: OAuth provider redirects back with token
5. **Use Token**: Same JWT token works across all services

## 🔐 Security Features

- **JWT Tokens**: Secure, stateless authentication
- **Token Expiration**: 7-day expiry with configurable refresh
- **CORS Protection**: Configured for specific origins
- **Input Validation**: Request validation and sanitization
- **Better Auth**: Built on Better Auth framework with PostgreSQL
    `,
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://eatzy-auth.intern.eatzy.com',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication endpoints',
    },
    {
      name: 'Verification',
      description: 'Token verification for other services',
    },
    {
      name: 'System',
      description: 'System health and information endpoints',
    },
  ],
});

// Swagger UI
app.get('/swagger', swaggerUI({ url: '/openapi.json' }));

// Root endpoint route
const rootRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: 'Service Information',
  description:
    'Get basic information about the auth service and available endpoints',
  responses: {
    200: {
      description: 'Service information',
      content: {
        'application/json': {
          schema: RootResponseSchema,
        },
      },
    },
  },
});

// Health check route
const healthRoute = createRoute({
  method: 'get',
  path: '/api/health',
  tags: ['System'],
  summary: 'Health Check',
  description: 'Check if the auth service is running and healthy',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

// Sign in route
const signInRoute = createRoute({
  method: 'post',
  path: '/api/auth/sign-in/email',
  tags: ['Authentication'],
  summary: 'Sign In with Email',
  description: `
Authenticate user with email and password. Returns a JWT token that can be used across all Eatzy services.

**Authentication Flow:**
1. User provides email and password
2. Service validates credentials against Eatzy API
3. If valid, returns JWT token and user information
4. Token can be used with Authorization header: \`Bearer <token>\`

**Token Usage:**
The returned JWT token works with all Eatzy services:
- Eatzy API: \`Authorization: Bearer <token>\`
- Kudoz App: \`Authorization: Bearer <token>\`
- Consumer Portal: \`Authorization: Bearer <token>\`
- Any future service: \`Authorization: Bearer <token>\`
  `,
  request: {
    body: {
      content: {
        'application/json': {
          schema: SignInRequestSchema,
        },
      },
      description: 'User credentials',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Authentication successful',
      content: {
        'application/json': {
          schema: SignInResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Token verification route
const verifyRoute = createRoute({
  method: 'post',
  path: '/api/verify',
  tags: ['Verification'],
  summary: 'Verify JWT Token',
  description: `
Verify a JWT token and return user information. This endpoint is used by other Eatzy services to validate tokens.

**Usage by Other Services:**
1. Extract token from Authorization header: \`Bearer <token>\`
2. Send token to this endpoint for verification
3. If valid, receive user and session information
4. Use user data for authorization decisions

**Integration Example:**
\`\`\`javascript
const token = req.headers.authorization?.replace('Bearer ', '');
const response = await fetch('http://auth-service/api/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});
const { valid, user } = await response.json();
if (valid) {
  req.user = user; // User is authenticated
}
\`\`\`
  `,
  request: {
    body: {
      content: {
        'application/json': {
          schema: VerifyTokenRequestSchema,
        },
      },
      description: 'JWT token to verify',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Token is valid',
      content: {
        'application/json': {
          schema: VerifyTokenResponseSchema,
        },
      },
    },
    400: {
      description: 'Token is required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid or expired token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Token verification failed',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Register documented routes with OpenAPI
app.openapi(rootRoute, (c) => {
  return c.json({
    message: 'Auth Service API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      verify: '/api/verify',
      swagger: '/swagger',
    },
  });
});

app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Add documented routes for sign-in and verify (for OpenAPI spec only)
// Note: Actual implementation is in server.ts with Better Auth
app.openapi(signInRoute, async (c) => {
  // This is just for OpenAPI documentation
  // Real implementation is in server.ts
  return c.json(
    { error: 'This endpoint is documented only. Use /api/auth/sign-in/email' },
    500,
  );
});

app.openapi(verifyRoute, async (c) => {
  // This is just for OpenAPI documentation
  // Real implementation is in server.ts
  return c.json(
    { error: 'This endpoint is documented only. Use /api/verify' },
    500,
  );
});

// Social login routes (documentation only - handled by Better Auth)
const googleLoginRoute = createRoute({
  method: 'get',
  path: '/api/auth/google',
  tags: ['Authentication'],
  summary: 'Google OAuth Login',
  description: `
Initiate Google OAuth login flow. This endpoint redirects users to Google's OAuth consent screen.

**Flow:**
1. User clicks "Login with Google" 
2. Redirect to this endpoint: GET /api/auth/google
3. User is redirected to Google OAuth consent screen
4. After consent, Google redirects back to /api/auth/callback/google
5. JWT token is returned and can be used across all Eatzy services

**Note:** This endpoint returns a redirect response, not JSON.
  `,
  responses: {
    302: {
      description: 'Redirect to Google OAuth consent screen',
    },
  },
});

const facebookLoginRoute = createRoute({
  method: 'get',
  path: '/api/auth/facebook',
  tags: ['Authentication'],
  summary: 'Facebook OAuth Login',
  description: `
Initiate Facebook OAuth login flow. This endpoint redirects users to Facebook's OAuth consent screen.

**Flow:**
1. User clicks "Login with Facebook"
2. Redirect to this endpoint: GET /api/auth/facebook  
3. User is redirected to Facebook OAuth consent screen
4. After consent, Facebook redirects back to /api/auth/callback/facebook
5. JWT token is returned and can be used across all Eatzy services

**Note:** This endpoint returns a redirect response, not JSON.
  `,
  responses: {
    302: {
      description: 'Redirect to Facebook OAuth consent screen',
    },
  },
});

app.openapi(googleLoginRoute, async (c) => {
  return c.redirect('/api/auth/google');
});

app.openapi(facebookLoginRoute, async (c) => {
  return c.redirect('/api/auth/facebook');
});

const appleLoginRoute = createRoute({
  method: 'get',
  path: '/api/auth/apple',
  tags: ['Authentication'],
  summary: 'Apple OAuth Login',
  description: `
Initiate Apple OAuth login flow. This endpoint redirects users to Apple's OAuth consent screen.

**Flow:**
1. User clicks "Continue with Apple"
2. Redirect to this endpoint: GET /api/auth/apple
3. User is redirected to Apple OAuth consent screen
4. After consent, Apple redirects back to /api/auth/callback/apple
5. JWT token is returned and can be used across all Eatzy services

**Note:** This endpoint returns a redirect response, not JSON.
  `,
  responses: {
    302: {
      description: 'Redirect to Apple OAuth consent screen',
    },
  },
});

app.openapi(appleLoginRoute, async (c) => {
  return c.redirect('/api/auth/apple');
});

export { app as docsApp, rootRoute, healthRoute, signInRoute, verifyRoute };
