# 🔐 Eatzy Auth Service

**Unified Authentication Service for All Eatzy Applications**

A centralized JWT-based authentication service that provides secure, scalable authentication for the entire Eatzy ecosystem. This service acts as the single source of truth for user authentication across all applications and services.

## 🌐 **Universal Token Support**

**One Token, All Services** - JWT tokens issued by this auth-service can be used across:

### ✅ **Supported Applications & Services:**
- **🍽️ Eatzy API** (`api.eatsy.local`) - Main food delivery API
- **🎯 Kudoz App React** (`kudoz-app-react`) - Loyalty & rewards frontend
- **🏪 Consumer Portal** (`consumer-portal`) - Customer web application  
- **🔧 Kudoz Backend** (`kudoz-backend`) - Kudoz backend API service

### 🔑 **Token Compatibility:**
```bash
# Same JWT token works everywhere:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ Works in Eatzy API
curl -H "Authorization: Bearer TOKEN" http://api.eatsy.local/account/profile

# ✅ Works in Kudoz App  
curl -H "Authorization: Bearer TOKEN" http://kudoz-app/api/user

# ✅ Works in Consumer Portal
curl -H "Authorization: Bearer TOKEN" http://consumer-portal/api/orders

# ✅ Works in Kudoz Backend
curl -H "Authorization: Bearer TOKEN" http://kudoz-backend/api/kudoz
```

## 🚀 Quick Start

### 1. Setup
```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
# Start the service
bun run dev
```

### 2. Test Authentication Flow

#### Sign In
```bash
curl -X POST http://localhost:3001/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@eatzy.com","password":"password123"}'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "test@eatzy.com",
    "username": "testuser"
  }
}
```

#### Verify Token
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN_HERE"}'
```

#### Get Current User
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/sign-in/email` | Email/password authentication |
| `GET` | `/api/auth/google` | Google OAuth login |
| `GET` | `/api/auth/facebook` | Facebook OAuth login |
| `GET` | `/api/auth/apple` | Apple OAuth login |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/verify` | Verify JWT token |
| `GET` | `/api/health` | Health check |
| `GET` | `/swagger` | **📖 Swagger UI Documentation** |
| `GET` | `/openapi.json` | OpenAPI specification |

## 📖 API Documentation

**Interactive Swagger UI available at:** `http://localhost:3001/swagger`

The Swagger documentation provides:
- **Interactive API testing** - Test all endpoints directly from the browser
- **Complete request/response schemas** - See all required fields and data types
- **Authentication examples** - Copy-paste ready curl commands
- **Integration guides** - How to use tokens across all Eatzy services
- **Error handling** - All possible error responses documented

### Quick Access:
- **Development**: http://localhost:3001/swagger
- **Production**: https://eatzy-auth.intern.eatzy.com/swagger

### Request/Response Examples

#### POST /api/auth/sign-in
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com",
    "username": "username"
  }
}
```

#### POST /api/verify
**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "1",
    "email": "user@example.com"
  }
}
```

## 🔧 **Service Integration Guide**

### 🎯 **For Frontend Applications (React, Vue, Angular)**

```javascript
// 1. Email/Password Sign in
const signInWithEmail = async (email, password) => {
  const response = await fetch('https://eatzy-auth.intern.eatzy.com/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  const data = await response.json()
  
  if (data.success) {
    localStorage.setItem('eatzy_token', data.token)
    return data.user
  }
  
  throw new Error(data.error)
}

// 2. Social Login (Google)
const signInWithGoogle = () => {
  // Redirect to Google OAuth
  window.location.href = 'https://eatzy-auth.intern.eatzy.com/api/auth/google'
}

// 3. Social Login (Facebook)
const signInWithFacebook = () => {
  // Redirect to Facebook OAuth
  window.location.href = 'https://eatzy-auth.intern.eatzy.com/api/auth/facebook'
}

// 2. Use token with ANY Eatzy service
const callAnyEatzyService = async (serviceUrl, endpoint) => {
  const token = localStorage.getItem('eatzy_token')
  
  const response = await fetch(`${serviceUrl}${endpoint}`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  
  return response.json()
}

// Examples:
// ✅ Call Eatzy API
await callAnyEatzyService('http://api.eatsy.local', '/account/profile')

// ✅ Call Kudoz Service  
await callAnyEatzyService('http://kudoz-app', '/api/user')

// ✅ Call Consumer Portal API
await callAnyEatzyService('http://consumer-portal', '/api/orders')

// ✅ Call Kudoz Backend API
await callAnyEatzyService('http://kudoz-backend', '/api/kudoz')
```

### 🔧 **For Backend Services (Node.js, PHP, Python)**

#### **Node.js Integration:**
```javascript
// Universal auth middleware for any Node.js service
const eatzyAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' })
  }
  
  const token = authHeader.substring(7)
  
  try {
    // Verify with central auth service
    const response = await fetch('https://eatzy-auth.intern.eatzy.com/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    
    const data = await response.json()
    
    if (data.valid) {
      req.user = data.user  // User available in all routes
      next()
    } else {
      res.status(401).json({ error: 'Invalid token' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Auth service unavailable' })
  }
}

// Use in any Node.js service:
app.use('/api', eatzyAuthMiddleware)  // Protect all /api routes
```

#### **PHP Integration (Eatzy API):**
```php
<?php
// Enhanced OAuth filter already supports JWT tokens from auth-service
// File: api/web/public/task/Filter/Impl/Auth/OAuthValidAccessTokenAuthFilter.php

class OAuthValidAccessTokenAuthFilter extends Filter {
    protected function isValid(TaskInput $input): FilterResult {
        // Automatically detects and validates:
        // ✅ Legacy OAuth tokens (40-char hex)
        // ✅ JWT tokens from auth-service (Better Auth format)
        
        // No code changes needed - works with both token types!
    }
}

// Usage in any API endpoint:
// Authorization: Bearer <legacy-oauth-token>  ✅ Works
// Authorization: Bearer <jwt-from-auth-service>  ✅ Works
?>
```

### 📱 **For Mobile Apps (iOS/Android)**

```swift
// iOS Swift Example
class EatzyAuthService {
    private let authBaseURL = "https://eatzy-auth.intern.eatzy.com"
    
    func signIn(email: String, password: String) async throws -> User {
        // Get universal token
        let token = try await authenticate(email: email, password: password)
        
        // Store securely - works for ALL Eatzy API calls
        KeychainHelper.store(token, forKey: "eatzy_universal_token")
        
        return user
    }
    
    func callAnyEatzyAPI(baseURL: String, endpoint: String) async throws -> Data {
        guard let token = KeychainHelper.retrieve(forKey: "eatzy_universal_token") else {
            throw AuthError.noToken
        }
        
        var request = URLRequest(url: URL(string: "\(baseURL)\(endpoint)")!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return data
    }
}

// Use with any service:
// ✅ Eatzy API: await callAnyEatzyAPI("http://api.eatsy.local", "/account/profile")
// ✅ Kudoz API: await callAnyEatzyAPI("http://kudoz-app", "/api/user")
```

## 🔐 **Universal Authentication Architecture**

### **🏗️ Centralized Auth Flow:**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Any Client    │───▶│   Auth-Service   │───▶│  Eatzy API      │
│ (Web/Mobile/API)│    │ (JWT Generator)  │    │ (User Verify)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Universal JWT   │◀─── Used by ALL services
                       │     Token        │
                       └──────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌─────────────┐ ┌─────────┐ ┌─────────────┐ ┌─────────────┐
            │ Kudoz App   │ │ API     │ │ Consumer    │ │ Kudoz       │
            │ React       │ │ Service │ │ Portal      │ │ Backend     │
            └─────────────┘ └─────────┘ └─────────────┘ └─────────────┘
```

### **🔑 Authentication Methods:**

#### **1. Email/Password Authentication**
```
User → Auth-Service → Eatzy API (/account/authorize) → Legacy Database → JWT Token
```
- **Primary Method**: Uses existing user database
- **Endpoint**: `POST /api/auth/sign-in/email`
- **Verification**: Against existing Eatzy user accounts
- **Output**: Universal JWT token for all services

#### **2. Social Authentication (Google, Facebook & Apple)**
```
User → Auth-Service → Social Provider (Google/Facebook/Apple) → Auth-Service DB → JWT Token
```
- **Supported Providers**: Google OAuth, Facebook OAuth, Apple OAuth
- **Endpoints**: `GET /api/auth/google`, `GET /api/auth/facebook`, `GET /api/auth/apple`
- **Flow**: OAuth redirect → consent → callback → JWT token
- **Integration**: Links with existing Eatzy accounts if email matches
- **Output**: Same universal JWT token format

#### **3. Legacy OAuth Support**
```
Existing Apps → Eatzy API → Enhanced Filter → Validates Both Token Types
```
- **Backward Compatibility**: Legacy 40-char OAuth tokens still work
- **Smart Detection**: API automatically detects token type
- **Gradual Migration**: No breaking changes for existing apps

### **🌐 Universal Endpoints:**

#### **Authentication (Any Client → Auth-Service):**
```bash
# Email/Password Login
curl -X POST https://eatzy-auth.intern.eatzy.com/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@eatzy.com","password":"password123"}'

# Social Login (Google) - Redirect in browser
GET https://eatzy-auth.intern.eatzy.com/api/auth/google

# Social Login (Facebook) - Redirect in browser
GET https://eatzy-auth.intern.eatzy.com/api/auth/facebook

# Token Verification (Any Service → Auth-Service)
curl -X POST https://eatzy-auth.intern.eatzy.com/api/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"JWT_TOKEN_HERE"}'
```

#### **Service Usage (Any Service with JWT Token):**
```bash
# ✅ Eatzy API - User Profile
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://api.eatsy.local/account/profile

# ✅ Kudoz App - User Data
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://kudoz-app/api/user

# ✅ Consumer Portal - Orders
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://consumer-portal/api/orders

# ✅ Kudoz Backend - Kudoz API
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://kudoz-backend/api/kudoz
```

## 🔐 Security Features

- **JWT Tokens**: Secure, stateless authentication
- **Token Expiration**: 7-day expiry with configurable refresh
- **CORS Protection**: Configured for specific origins
- **Rate Limiting**: Built-in request rate limiting
- **Helmet Security**: Security headers and protection
- **Input Validation**: Request validation and sanitization
- **Dual Authentication**: Legacy API + Social providers

## 🛠️ Configuration

### Environment Variables

#### Basic Configuration
```env
PORT=3001
NODE_ENV=development
BETTER_AUTH_SECRET=your-jwt-secret-key  # Better Auth JWT secret
BETTER_AUTH_URL=http://localhost:3001  # https://eatzy-auth.intern.eatzy.com in staging
API_SERVICE_URL=http://api.eatsy.local
API_SERVICE_TOKEN=your-api-service-shared-secret  # Shared secret for API access
```

#### Database Configuration
**Note**: We use individual database parameters instead of `DATABASE_URL` to avoid SSL connection issues.

```env
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=auth_service

# SSL Configuration (Production)
DB_SSL=false                        # Enable SSL connection
DB_CA_CERT=                         # CA certificate content (not file path)
DB_SSL_REJECT_UNAUTHORIZED=true     # Reject unauthorized SSL connections
```

#### SSL Configuration Examples

**Development (No SSL):**
```env
DB_SSL=false
DB_CA_CERT=
DB_SSL_REJECT_UNAUTHORIZED=true
```

**Production with SSL + CA Certificate:**
```env
DB_SSL=true
DB_CA_CERT=-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
...
-----END CERTIFICATE-----
DB_SSL_REJECT_UNAUTHORIZED=true
```

**Production with SSL (No CA Certificate):**
```env
DB_SSL=true
DB_CA_CERT=
DB_SSL_REJECT_UNAUTHORIZED=false
```

#### Social Authentication Configuration
```env
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth (optional)
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

**Note**: Leave social auth credentials empty to disable social login.

### 🔐 Inter-Service Security

**Two-Level Security Model:**

**Level 1: Auth-service ↔ API Service** (Shared Secret Required)
- Auth-service calls API dengan `API_SERVICE_TOKEN` 
- API verifies token sebelum process user verification
- Protects API endpoints dari unauthorized access

**Level 2: Other Services ↔ Auth-service** (No Secret Sharing)
- Services call auth-service `/verify` dengan JWT token
- Auth-service verifies JWT dan return user data
- No shared secret needed - centralized verification

```
User → Auth-service → API (with shared secret) → User verification
JWT → Other Service → Auth-service (no secret) → User data
```

### 🗄️ Database Setup

#### SSL Configuration
The auth-service follows the same database connection pattern as `kudoz-backend`:

- **No DATABASE_URL**: Uses individual DB parameters to avoid SSL issues
- **CA Certificate Support**: Provide certificate content in `DB_CA_CERT` environment variable
- **Flexible SSL**: Works with or without CA certificates in production

#### Database Migrations
```bash
# Initialize database with Better Auth tables (one-time setup)
bun run db:migrate

# Development with local PostgreSQL
bun run dev
```

**Better Auth Auto-Migration:**
- ✅ Better Auth automatically creates required tables (`user`, `session`, `account`, `verification`)
- ✅ Migration files generated automatically by Drizzle
- ✅ Tables created on first startup with proper SSL configuration
- ✅ No manual schema management needed - Better Auth handles everything

**Migration Files:**
- `drizzle/0000_*.sql` - Auto-generated by Better Auth + Drizzle
- Contains only essential auth tables (no legacy compatibility tables)
- SSL configuration automatically applied during migration

### Test Credentials
For development/testing:
- **Email**: `test@eatzy.com`
- **Password**: `password123`

## 🧪 Testing

Run the integration test:
```bash
node test-integration.js
```

## 📋 Phase Implementation

### ✅ Phase 1 (Completed)
- JWT-based auth service created
- Integration with existing API for user verification
- Ready for new Kudoz Service and React app
- All endpoints tested and working

### 🔄 Phase 2 (Next)
- Update existing API to accept both old and new JWT tokens
- Gradual migration of existing services

### 🔄 Phase 3 (Future)
- Update mobile apps to use JWT authentication
- Complete migration from old authentication system

## 🏗️ Architecture Notes

### Database Connection Pattern
The auth-service follows the exact same database connection pattern as `kudoz-backend`:

```typescript
// Same SSL configuration logic as kudoz-backend
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_CA_CERT !== '' 
    ? {
        rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED,
        ca: env.DB_CA_CERT,  // Certificate content, not file path
      }
    : env.DB_SSL ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED } : undefined,
});
```

### Why Individual DB Parameters?
- **Avoids SSL Issues**: `DATABASE_URL` can cause SSL connection problems
- **Consistent Pattern**: Matches `kudoz-backend` configuration
- **Flexible SSL**: Easy to configure SSL with or without CA certificates
- **Environment Specific**: Different SSL settings per environment

## 🔄 Next Steps

1. **✅ SSL Configuration**: Implemented with CA certificate support
2. **✅ API Integration**: Connected to existing API for user verification  
3. **✅ Better Auth**: Fully implemented with PostgreSQL
4. **🔄 Email Verification**: Add email verification flow
5. **🔄 Password Reset**: Implement password reset functionality
6. **🔄 Production Deployment**: Deploy with proper SSL certificates

## Development Commands

```bash
# Development with hot reload
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Database migration
bun run db:migrate

# Lint code
bun run lint

# Run tests
bun run test

# Integration tests
node test-integration.js
node test-kudoz-integration.js
```

## 🚀 Quick Start Guide

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database configuration
   ```

3. **Start development server:**
   ```bash
   bun run dev
   ```

4. **Access Swagger documentation:**
   ```
   http://localhost:3001/swagger
   ```

5. **Test the API:**
   - Use Swagger UI for interactive testing
   - Or use curl commands from [docs/api-examples.md](docs/api-examples.md)

## ✅ Implementation Status

### Completed Features
- **✅ SSL Configuration**: Full SSL support with CA certificates (matches kudoz-backend pattern)
- **✅ Database Connection**: Individual DB parameters (no DATABASE_URL to avoid SSL issues in prod)
- **✅ Better Auth Integration**: Complete JWT authentication with PostgreSQL
- **✅ API Integration**: Connected to existing eatzy-api for user verification
- **✅ Security**: Two-level security model with shared secrets
- **✅ Migration Support**: SSL-aware database migrations
- **✅ Environment Configuration**: Flexible SSL settings per environment
