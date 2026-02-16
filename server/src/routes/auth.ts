import { Router, Request, Response } from 'express';
import { validateAdminCredentials, generateToken } from '../middleware/auth.js';
import { logAuditAction } from '../middleware/audit.js';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const isValid = await validateAdminCredentials(username, password);
    if (!isValid) {
      logAuditAction('anonymous', 'LOGIN_FAILED', {
        metadata: { username },
        ip: req.ip || 'unknown',
      });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(username);

    // Set HTTP-only cookie for secure token storage
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    logAuditAction(username, 'LOGIN_SUCCESS', {
      ip: req.ip || 'unknown',
    });

    res.json({
      success: true,
      token, // Also return token for header-based auth
      user: {
        username,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('adminToken');
  res.json({ success: true });
});

export default router;
