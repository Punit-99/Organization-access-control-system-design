import { z } from 'zod';
import { Feature } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const permissionActionSchema = z.enum(['GRANT', 'REVOKE']);

export const permissionSchema = z.object({
  feature: z.nativeEnum(Feature, {
    message: 'Invalid Feature type',
  }),
  action: permissionActionSchema,
});

export type PermissionInput = z.infer<typeof permissionSchema>;
