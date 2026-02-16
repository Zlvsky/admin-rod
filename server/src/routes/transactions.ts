import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// List transactions with pagination
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const params = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      userId: z.string().optional(),
      accountType: z.enum(['BUYMEACOFFEE', 'PATREON']).optional(),
      transactionType: z.enum(['SUBSCRIPTION', 'ONETIME_SUPPORT', 'EXTRA_PURCHASE', 'COINS']).optional(),
      isProcessed: z.coerce.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).parse(req.query);
    
    const where: any = {};
    
    if (params.userId) {
      where.userId = params.userId;
    }
    
    if (params.accountType) {
      where.accountType = params.accountType;
    }
    
    if (params.transactionType) {
      where.transactionType = params.transactionType;
    }
    
    if (params.isProcessed !== undefined) {
      where.isProcessed = params.isProcessed;
    }
    
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }
    
    const [transactions, total, stats] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true } }
        }
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true, coinsAwarded: true, premiumDays: true },
        _count: true,
      })
    ]);

    res.json({
      data: transactions,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
      stats: {
        totalAmount: stats._sum.amount || 0,
        totalCoinsAwarded: stats._sum.coinsAwarded || 0,
        totalPremiumDays: stats._sum.premiumDays || 0,
        count: stats._count,
      }
    });
  } catch (error) {
    console.error('[Transactions] List error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            premiumExpiresAt: true,
            characters: {
              select: { id: true, name: true, coins: true }
            }
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('[Transactions] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Revenue summary
router.get('/stats/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const [thisMonth, lastMonth, thisYear, allTime, byType, byAccount] = await Promise.all([
      // This month
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          isProcessed: true,
        },
        _sum: { amount: true },
        _count: true,
      }),
      
      // Last month
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
          isProcessed: true,
        },
        _sum: { amount: true },
        _count: true,
      }),
      
      // This year
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: startOfYear },
          isProcessed: true,
        },
        _sum: { amount: true },
        _count: true,
      }),
      
      // All time
      prisma.transaction.aggregate({
        where: { isProcessed: true },
        _sum: { amount: true },
        _count: true,
      }),
      
      // By transaction type
      prisma.transaction.groupBy({
        by: ['transactionType'],
        _sum: { amount: true },
        _count: true,
        where: { isProcessed: true },
      }),
      
      // By account type
      prisma.transaction.groupBy({
        by: ['accountType'],
        _sum: { amount: true },
        _count: true,
        where: { isProcessed: true },
      }),
    ]);

    res.json({
      periods: {
        thisMonth: { amount: thisMonth._sum.amount || 0, count: thisMonth._count },
        lastMonth: { amount: lastMonth._sum.amount || 0, count: lastMonth._count },
        thisYear: { amount: thisYear._sum.amount || 0, count: thisYear._count },
        allTime: { amount: allTime._sum.amount || 0, count: allTime._count },
      },
      byType: byType.map(t => ({
        type: t.transactionType,
        amount: t._sum.amount || 0,
        count: t._count,
      })),
      byAccount: byAccount.map(a => ({
        account: a.accountType,
        amount: a._sum.amount || 0,
        count: a._count,
      })),
    });
  } catch (error) {
    console.error('[Transactions] Summary error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
});

export default router;
