import { z } from 'zod';

// Request schemas
export const SignInRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const VerifyTokenRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Response schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  username: z.string(),
  emailVerified: z.boolean(),
});

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
});

export const SignInResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  user: UserSchema,
});

export const VerifyTokenResponseSchema = z.object({
  valid: z.boolean(),
  user: UserSchema,
  session: SessionSchema,
});

export const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  timestamp: z.string(),
});

export const RootResponseSchema = z.object({
  message: z.string(),
  version: z.string(),
  endpoints: z.object({
    health: z.string(),
    auth: z.string(),
    verify: z.string(),
    swagger: z.string(),
  }),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

// Type exports
export type SignInRequest = z.infer<typeof SignInRequestSchema>;
export type VerifyTokenRequest = z.infer<typeof VerifyTokenRequestSchema>;
export type SignInResponse = z.infer<typeof SignInResponseSchema>;
export type VerifyTokenResponse = z.infer<typeof VerifyTokenResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type RootResponse = z.infer<typeof RootResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
