import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface AdminPayload {
  username: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminPayload;
}

// Validate admin credentials from environment
export async function validateAdminCredentials(username: string, password: string): Promise<boolean> {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('[Auth] ADMIN_USERNAME or ADMIN_PASSWORD not configured');
    return false;
  }

  if (username !== adminUsername) {
    return false;
  }

  // For simplicity, we compare plain text password from env
  // In production, you might want to hash the password in .env
  // and use bcrypt.compare here
  return password === adminPassword;
}

// Generate JWT token
export function generateToken(username: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(
    { username },
    secret,
    { expiresIn }
  );
}

// Verify JWT token
export function verifyToken(token: string): AdminPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    return jwt.verify(token, secret) as AdminPayload;
  } catch (error) {
    return null;
  }
}

// Authentication middleware
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Get token from Authorization header or cookie
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies?.adminToken) {
    token = req.cookies.adminToken;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.admin = payload;
  next();
}

// Hash password utility (for future use if storing admin in DB)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
