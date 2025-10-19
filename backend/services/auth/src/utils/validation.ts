/**
 * Input Validation Schemas (Zod)
 */

import { z } from 'zod';

/**
 * Registration initialization request
 */
export const RegisterInitSchema = z.object({
  deviceName: z.string().min(1).max(100).optional(),
});

/**
 * Registration verification request
 */
export const RegisterVerifySchema = z.object({
  userId: z.string().uuid(),
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
    }),
    type: z.literal('public-key'),
  }),
});

/**
 * Authentication initialization request
 */
export const AuthInitSchema = z.object({
  userId: z.string().uuid().optional(),
});

/**
 * Authentication verification request
 */
export const AuthVerifySchema = z.object({
  userId: z.string().uuid(),
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.literal('public-key'),
  }),
});

/**
 * Refresh token request
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
