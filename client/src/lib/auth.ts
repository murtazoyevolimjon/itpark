import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return 'dev-only-jwt-secret-do-not-use-in-production';
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  centerId: string;
  id?: string;
  fullName?: string;
  centerName?: string;
  /** 'refresh' tokens are never accepted as API credentials */
  typ?: 'access' | 'refresh';
}

export function signToken(payload: JwtPayload): { accessToken: string; refreshToken: string } {
  const secret = getJwtSecret();
  const accessToken = jwt.sign({ ...payload, typ: 'access' }, secret, { expiresIn: '1d', algorithm: 'HS256' });
  const refreshToken = jwt.sign({ ...payload, typ: 'refresh' }, secret, { expiresIn: '7d', algorithm: 'HS256' });
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    // Only HS256 (no algorithm confusion) and never a refresh token: it would act as a 7-day access token
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as JwtPayload;
    return decoded.typ === 'refresh' ? null : decoded;
  } catch (error) {
    return null;
  }
}

export function getAuthUser(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}
