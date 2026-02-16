import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

import authRoutes from './auth.js';
import dashboardRoutes from './dashboard.js';
import usersRoutes from './users.js';
import charactersRoutes from './characters.js';
import guildsRoutes from './guilds.js';
import itemsRoutes from './items.js';
import transactionsRoutes from './transactions.js';
import arenaRoutes from './arena.js';
import { readAuditLogs } from '../middleware/audit.js';

const router = Router();

// Public auth routes (login, logout)
router.use('/auth', authRoutes);

// Protected auth route (me) - needs to be explicitly protected
router.get('/auth/me', authMiddleware, (req, res) => {
  const admin = (req as any).admin;
  res.json({ 
    user: {
      username: admin.username,
      role: 'admin',
    }
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes (auth required)
router.use('/dashboard', authMiddleware, dashboardRoutes);
router.use('/users', authMiddleware, usersRoutes);
router.use('/characters', authMiddleware, charactersRoutes);
router.use('/guilds', authMiddleware, guildsRoutes);
router.use('/items', authMiddleware, itemsRoutes);
router.use('/transactions', authMiddleware, transactionsRoutes);
router.use('/arena', authMiddleware, arenaRoutes);

// Audit logs endpoint
router.get('/audit-logs', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const logs = readAuditLogs(startDate, endDate);
    res.json(logs);
  } catch (error) {
    console.error('[Audit] Read logs error:', error);
    res.status(500).json({ error: 'Failed to read audit logs' });
  }
});

// Broadcast message to all characters
router.post('/system/broadcast', authMiddleware, async (req, res) => {
  try {
    const { getPrisma } = await import('../config/database.js');
    const { logAuditAction } = await import('../middleware/audit.js');
    const prisma = getPrisma();
    
    const { title, message } = req.body as { title: string; message: string };
    
    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required' });
      return;
    }

    // Get all inboxes
    const inboxes = await prisma.inbox.findMany({
      select: { characterId: true }
    });

    const newMessage = {
      id: crypto.randomUUID(),
      title,
      message,
      type: 'SYSTEM',
      from: 'SYSTEM',
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Batch update all inboxes
    await prisma.$transaction(
      inboxes.map(inbox =>
        prisma.inbox.update({
          where: { characterId: inbox.characterId },
          data: {
            messages: { push: newMessage }
          }
        })
      )
    );

    logAuditAction((req as any).admin?.username || 'unknown', 'SYSTEM_BROADCAST', {
      metadata: { title, recipientCount: inboxes.length },
      ip: req.ip || 'unknown',
    });

    res.json({
      success: true,
      message: `Broadcast sent to ${inboxes.length} characters`
    });
  } catch (error) {
    console.error('[System] Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

export default router;
