import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditAction } from '../middleware/audit.js';

const router = Router();

// Validation schemas
const listUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  premiumOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'email', 'index']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  premiumExpiresAt: z.string().datetime().nullable().optional(),
});

// List users with pagination and search
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const params = listUsersSchema.parse(req.query);
    
    const where: any = {};
    
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { characters: { some: { name: { contains: params.search, mode: 'insensitive' } } } },
      ];
    }
    
    if (params.premiumOnly) {
      where.premiumExpiresAt = { gt: new Date() };
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        select: {
          id: true,
          email: true,
          index: true,
          createdAt: true,
          premiumExpiresAt: true,
          isTemporary: true,
          appleUserId: true,
          googleUserId: true,
          _count: {
            select: { characters: true, transactions: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      data: users.map(u => ({
        ...u,
        isPremium: u.premiumExpiresAt && u.premiumExpiresAt > new Date(),
        characterCount: u._count.characters,
        transactionCount: u._count.transactions,
        authMethod: u.appleUserId ? 'apple' : u.googleUserId ? 'google' : 'email',
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    });
  } catch (error) {
    console.error('[Users] List error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user with full details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        characters: {
          include: {
            statistics: true,
            guildMember: {
              include: { guild: { select: { id: true, name: true, tag: true } } }
            },
            _count: {
              select: { quests: true, stages: true }
            }
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        premiumAccounts: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      ...user,
      password: undefined, // Never send password
      refreshToken: undefined,
      isPremium: user.premiumExpiresAt && user.premiumExpiresAt > new Date(),
    });
  } catch (error) {
    console.error('[Users] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    // Get current user for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { email: true, premiumExpiresAt: true }
    });

    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        premiumExpiresAt: data.premiumExpiresAt ? new Date(data.premiumExpiresAt) : data.premiumExpiresAt,
      },
      select: {
        id: true,
        email: true,
        premiumExpiresAt: true,
      }
    });

    // Log the action
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (data.email && data.email !== currentUser.email) {
      changes.email = { from: currentUser.email, to: data.email };
    }
    if (data.premiumExpiresAt !== undefined) {
      changes.premiumExpiresAt = { 
        from: currentUser.premiumExpiresAt, 
        to: data.premiumExpiresAt 
      };
    }

    logAuditAction(req.admin?.username || 'unknown', 'USER_UPDATE', {
      target: { type: 'user', id, name: currentUser.email },
      changes,
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Users] Update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Grant premium to user
router.post('/:id/grant-premium', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { days } = z.object({ days: z.coerce.number().min(1).max(365) }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true, premiumExpiresAt: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate new expiry date
    const currentExpiry = user.premiumExpiresAt && user.premiumExpiresAt > new Date() 
      ? user.premiumExpiresAt 
      : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

    const updated = await prisma.user.update({
      where: { id },
      data: { premiumExpiresAt: newExpiry },
      select: { id: true, email: true, premiumExpiresAt: true }
    });

    // Also update all characters to premium
    await prisma.character.updateMany({
      where: { userId: id },
      data: { isPremium: true }
    });

    logAuditAction(req.admin?.username || 'unknown', 'USER_GRANT_PREMIUM', {
      target: { type: 'user', id, name: user.email },
      changes: {
        premiumExpiresAt: { from: user.premiumExpiresAt, to: newExpiry },
        daysGranted: { from: 0, to: days },
      },
      ip: req.ip || 'unknown',
    });

    res.json({
      success: true,
      user: updated,
      message: `Granted ${days} days of premium. New expiry: ${newExpiry.toISOString()}`
    });
  } catch (error) {
    console.error('[Users] Grant premium error:', error);
    res.status(500).json({ error: 'Failed to grant premium' });
  }
});

// Delete user (with confirmation)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { confirm } = z.object({ confirm: z.literal('DELETE') }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { 
        email: true,
        _count: { select: { characters: true, transactions: true } }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete in correct order due to foreign key constraints
    // First get all character IDs
    const characters = await prisma.character.findMany({
      where: { userId: id },
      select: { id: true }
    });
    const characterIds = characters.map(c => c.id);

    // Delete character-related data
    if (characterIds.length > 0) {
      await prisma.$transaction([
        // Delete guild memberships first
        prisma.guildMember.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.guildInvite.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.guildRequest.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.guildCheckin.deleteMany({ where: { characterId: { in: characterIds } } }),
        
        // Delete game progress
        prisma.quest.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.bestiary.deleteMany({ where: { characterId: { in: characterIds } } }),
        
        // Delete items via inventory
        prisma.item.deleteMany({ where: { inventory: { characterId: { in: characterIds } } } }),
        prisma.item.deleteMany({ where: { mountInventory: { characterId: { in: characterIds } } } }),
        
        // Now delete the character data
        prisma.statistics.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.equipment.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.inventory.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.mountInventory.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.activity.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.missions.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.dungeon.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.corruptedDungeon.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.depths.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.inbox.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.arenaRanking.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.tasks.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.huntingBosses.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.village.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.expedition.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.merchant.deleteMany({ where: { characterId: { in: characterIds } } }),
        prisma.homestead.deleteMany({ where: { characterId: { in: characterIds } } }),
      ]);
    }

    // Delete characters
    await prisma.character.deleteMany({ where: { userId: id } });

    // Delete user-related data
    await prisma.premiumAccount.deleteMany({ where: { userId: id } });
    await prisma.transaction.deleteMany({ where: { userId: id } });

    // Finally delete the user
    await prisma.user.delete({ where: { id } });

    logAuditAction(req.admin?.username || 'unknown', 'USER_DELETE', {
      target: { type: 'user', id, name: user.email },
      metadata: {
        charactersDeleted: user._count.characters,
        transactionsDeleted: user._count.transactions,
      },
      ip: req.ip || 'unknown',
    });

    res.json({ 
      success: true, 
      message: `Deleted user ${user.email} and ${user._count.characters} characters` 
    });
  } catch (error) {
    console.error('[Users] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ==================== Premium Account Endpoints ====================

const premiumAccountSchema = z.object({
  accountType: z.enum(['BUYMEACOFFEE', 'PATREON']),
  accountEmail: z.string().email(),
  isVerified: z.boolean().default(false),
});

// Create premium account for user
router.post('/:id/premium-accounts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const data = premiumAccountSchema.parse(req.body);

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check for existing account of same type
    const existing = await prisma.premiumAccount.findFirst({
      where: { userId: id, accountType: data.accountType }
    });

    if (existing) {
      res.status(400).json({ error: `User already has a ${data.accountType} account linked` });
      return;
    }

    const premiumAccount = await prisma.premiumAccount.create({
      data: {
        userId: id,
        accountType: data.accountType,
        accountEmail: data.accountEmail,
        isVerified: data.isVerified,
      }
    });

    logAuditAction(req.admin?.username || 'unknown', 'PREMIUM_ACCOUNT_CREATE', {
      target: { type: 'user', id, name: user.email },
      metadata: {
        premiumAccountId: premiumAccount.id,
        accountType: data.accountType,
        accountEmail: data.accountEmail,
      },
      ip: req.ip || 'unknown',
    });

    res.status(201).json(premiumAccount);
  } catch (error) {
    console.error('[Users] Create premium account error:', error);
    res.status(500).json({ error: 'Failed to create premium account' });
  }
});

// Update premium account
router.patch('/:id/premium-accounts/:accountId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id, accountId } = req.params;
    const data = premiumAccountSchema.partial().parse(req.body);

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check account exists and belongs to user
    const existing = await prisma.premiumAccount.findFirst({
      where: { id: parseInt(accountId), userId: id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Premium account not found' });
      return;
    }

    // If changing account type, check for duplicates
    if (data.accountType && data.accountType !== existing.accountType) {
      const duplicate = await prisma.premiumAccount.findFirst({
        where: { userId: id, accountType: data.accountType }
      });
      if (duplicate) {
        res.status(400).json({ error: `User already has a ${data.accountType} account linked` });
        return;
      }
    }

    const updated = await prisma.premiumAccount.update({
      where: { id: parseInt(accountId) },
      data,
    });

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (data.accountType && data.accountType !== existing.accountType) {
      changes.accountType = { from: existing.accountType, to: data.accountType };
    }
    if (data.accountEmail && data.accountEmail !== existing.accountEmail) {
      changes.accountEmail = { from: existing.accountEmail, to: data.accountEmail };
    }
    if (data.isVerified !== undefined && data.isVerified !== existing.isVerified) {
      changes.isVerified = { from: existing.isVerified, to: data.isVerified };
    }

    logAuditAction(req.admin?.username || 'unknown', 'PREMIUM_ACCOUNT_UPDATE', {
      target: { type: 'user', id, name: user.email },
      metadata: { premiumAccountId: parseInt(accountId) },
      changes,
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Users] Update premium account error:', error);
    res.status(500).json({ error: 'Failed to update premium account' });
  }
});

// Delete premium account
router.delete('/:id/premium-accounts/:accountId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id, accountId } = req.params;

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check account exists and belongs to user
    const existing = await prisma.premiumAccount.findFirst({
      where: { id: parseInt(accountId), userId: id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Premium account not found' });
      return;
    }

    await prisma.premiumAccount.delete({
      where: { id: parseInt(accountId) }
    });

    logAuditAction(req.admin?.username || 'unknown', 'PREMIUM_ACCOUNT_DELETE', {
      target: { type: 'user', id, name: user.email },
      metadata: {
        premiumAccountId: parseInt(accountId),
        accountType: existing.accountType,
        accountEmail: existing.accountEmail,
      },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: 'Premium account deleted' });
  } catch (error) {
    console.error('[Users] Delete premium account error:', error);
    res.status(500).json({ error: 'Failed to delete premium account' });
  }
});

export default router;
