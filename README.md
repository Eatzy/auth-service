# Auth Service

JWT-based authentication service that integrates with the existing API service for user verification.

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
| `POST` | `/api/auth/sign-in` | User authentication |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/verify` | Verify JWT token |
| `GET` | `/api/health` | Health check |

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

## 🔧 Integration Examples

### React/Frontend Integration

```javascript
// Sign in
const signIn = async (email, password) => {
  const response = await fetch('http://localhost:3001/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  const data = await response.json()
  
  if (data.success) {
    localStorage.setItem('token', data.token)
    return data.user
  }
  
  throw new Error(data.error)
}

// Get current user
const getCurrentUser = async () => {
  const token = localStorage.getItem('token')
  
  const response = await fetch('http://localhost:3001/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  return response.json()
}
```

### Node.js/Backend Integration

```javascript
// Middleware to verify JWT tokens
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' })
  }
  
  const token = authHeader.substring(7)
  
  try {
    const response = await fetch('http://localhost:3001/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    
    const data = await response.json()
    
    if (data.valid) {
      req.user = data.user
      next()
    } else {
      res.status(401).json({ error: 'Invalid token' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Token verification failed' })
  }
}
```

## 🔐 Security Features

- **JWT Tokens**: Secure, stateless authentication
- **Token Expiration**: 7-day expiry with configurable refresh
- **CORS Protection**: Configured for specific origins
- **Rate Limiting**: Built-in request rate limiting
- **Helmet Security**: Security headers and protection
- **Input Validation**: Request validation and sanitization

## 🛠️ Configuration

### Environment Variables
```env
PORT=3001
BETTER_AUTH_SECRET=your-jwt-secret-key  # Better Auth JWT secret
BETTER_AUTH_URL=http://localhost:3001  # https://eatzy-auth.intern.eatzy.com in staging
API_SERVICE_URL=http://api.eatsy.local
API_SERVICE_TOKEN=your-api-service-shared-secret  # Shared secret for API access
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_service
```

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

### 🗄️ Database Migrations

**Better Auth Auto-Migration:**
- Better Auth automatically creates required tables
- No manual migration files needed
- Tables created on first startup
- Run `bun run db:migrate` to initialize

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

## 🔄 Next Steps

1. **Connect to Real Database**: Replace mock user verification with actual database queries
2. **API Integration**: Connect to existing API for user verification
3. **Better Auth Upgrade**: Migrate to Better Auth for advanced features
4. **PostgreSQL**: Switch from SQLite to PostgreSQL for production
5. **Email Verification**: Add email verification flow
6. **Password Reset**: Implement password reset functionality

## Development Commands

```bash
# Development with hot reload
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Lint code
bun run lint

# Run tests
bun run test
```