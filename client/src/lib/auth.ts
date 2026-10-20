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
}

export function signToken(payload: JwtPayload): { accessToken: string; refreshToken: string } {
  const secret = getJwtSecret();
  const accessToken = jwt.sign(payload, secret, { expiresIn: '1d' });
  const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
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
