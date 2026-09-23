import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const SUPERADMIN_JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || 'superadmin-secret-jwt-key-2026';

export interface SuperAdminJwtPayload {
  sub: string;
  login: string;
  role: 'SUPERADMIN';
  fullName: string;
}

export function signSuperAdminToken(payload: SuperAdminJwtPayload): string {
  return jwt.sign(payload, SUPERADMIN_JWT_SECRET, { expiresIn: '7d' });
}

export function verifySuperAdminToken(token: string): SuperAdminJwtPayload | null {
  try {
    const decoded = jwt.verify(token, SUPERADMIN_JWT_SECRET) as SuperAdminJwtPayload;
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
