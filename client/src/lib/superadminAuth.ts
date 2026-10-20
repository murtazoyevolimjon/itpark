import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

function getSuperAdminSecret(): string {
  const secret = process.env.SUPERADMIN_JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SUPERADMIN_JWT_SECRET environment variable is not configured');
  }
  return 'dev-only-superadmin-secret-do-not-use-in-production';
}

export interface SuperAdminJwtPayload {
  sub: string;
  login: string;
  role: 'SUPERADMIN';
  fullName: string;
}

export function signSuperAdminToken(payload: SuperAdminJwtPayload): string {
  return jwt.sign(payload, getSuperAdminSecret(), { expiresIn: '12h' });
}

export function verifySuperAdminToken(token: string): SuperAdminJwtPayload | null {
  try {
    const decoded = jwt.verify(token, getSuperAdminSecret()) as SuperAdminJwtPayload;
    if (decoded && decoded.role === 'SUPERADMIN') {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function getSuperAdminAuth(req: NextRequest): SuperAdminJwtPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifySuperAdminToken(token);
}
