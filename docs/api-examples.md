# 📖 Auth Service API Examples

## 🔗 Swagger UI
**Interactive documentation:** http://localhost:3001/swagger

## 🧪 Test Credentials
For development/testing:
- **Email**: `test@eatzy.com`
- **Password**: `password123`

## 📋 Example Requests

### 1. Email/Password Sign In
```bash
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@eatzy.com",
    "password": "password123"
  }'
```

### 1b. Social Login (Google)
```bash
# Redirect user to this URL in browser:
http://localhost:3001/api/auth/google

# User will be redirected to Google OAuth, then back to your app with token
```

### 1c. Social Login (Facebook)
```bash
# Redirect user to this URL in browser:
http://localhost:3001/api/auth/facebook

# User will be redirected to Facebook OAuth, then back to your app with token
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "test@eatzy.com",
    "name": "Test User",
    "username": "test",
    "emailVerified": true
  }
}
```

### 2. Verify Token
```bash
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "1",
    "email": "test@eatzy.com",
    "name": "Test User",
    "username": "test",
    "emailVerified": true
  },
  "session": {
    "id": "session_123",
    "userId": "1",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Health Check
```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. Service Info
```bash
curl http://localhost:3001/
```

**Response:**
```json
{
  "message": "Auth Service API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/api/health",
    "auth": "/api/auth/*",
    "verify": "/api/verify",
    "docs": "/docs"
  }
}
```

## 🔧 Integration Examples

### Frontend (JavaScript)
```javascript
// Sign in and get token
const signIn = async (email, password) => {
  const response = await fetch('http://localhost:3001/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('auth_token', data.token);
    return data.user;
  }
  throw new Error(data.error);
};

// Use token with other services
const callProtectedAPI = async (url, options = {}) => {
  const token = localStorage.getItem('auth_token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

### Backend (Node.js)
```javascript
// Middleware to verify tokens
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const response = await fetch('http://localhost:3001/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    const data = await response.json();
    
    if (data.valid) {
      req.user = data.user;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
};
```

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid email format"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 500 Internal Server Error
```json
{
  "error": "Something went wrong!"
}
```

## 🔗 Related Documentation
- **Main README**: [../README.md](../README.md)
- **Swagger UI**: http://localhost:3001/swagger
- **OpenAPI Spec**: http://localhost:3001/openapi.json