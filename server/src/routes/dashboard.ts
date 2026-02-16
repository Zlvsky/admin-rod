import { Router, Response } from 'express';
import { getPrisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get dashboard statistics
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    // Run all queries in parallel for better performance
    const [
      totalUsers,
      totalCharacters,
      totalGuilds,
      totalItems,
      totalTransactions,
      premiumUsers,
      activeUsersLast7Days,
      recentDailyLevels,
      revenueStats,
      topGuilds,
      recentTransactions,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total characters
      prisma.character.count(),
      
      // Total guilds
      prisma.guild.count(),
      
      // Total items in all inventories
      prisma.item.count(),
      
      // Total transactions
      prisma.transaction.count(),
      
      // Premium users (premiumExpiresAt > now)
      prisma.user.count({
        where: {
          premiumExpiresAt: { gt: new Date() }
        }
      }),
      
      // Active users in last 7 days (by character activity)
      prisma.character.count({
        where: {
          guildMember: {
            lastActive: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }
      }),
      
      // Recent daily average levels
      prisma.dailyAverageLevel.findMany({
        orderBy: { date: 'desc' },
        take: 7,
      }),
      
      // Revenue stats
      prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { isProcessed: true }
      }),
      
      // Top guilds by honor
      prisma.guild.findMany({
        orderBy: { honor: 'desc' },
        take: 5,
        include: {
          _count: { select: { members: true } }
        }
      }),
      
      // Recent transactions
      prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { email: true } }
        }
      }),
    ]);

    // Character level distribution
    const levelDistribution = await prisma.character.groupBy({
      by: ['level'],
      _count: true,
      orderBy: { level: 'asc' }
    });

    // Aggregate level ranges
    const levelRanges = {
      '1-10': 0,
      '11-25': 0,
      '26-50': 0,
      '51-75': 0,
      '76-100': 0,
      '100+': 0,
    };

    for (const { level, _count } of levelDistribution) {
      if (level <= 10) levelRanges['1-10'] += _count;
      else if (level <= 25) levelRanges['11-25'] += _count;
      else if (level <= 50) levelRanges['26-50'] += _count;
      else if (level <= 75) levelRanges['51-75'] += _count;
      else if (level <= 100) levelRanges['76-100'] += _count;
      else levelRanges['100+'] += _count;
    }

    res.json({
      overview: {
        totalUsers,
        totalCharacters,
        totalGuilds,
        totalItems,
        totalTransactions,
        premiumUsers,
        activeUsersLast7Days,
        totalRevenue: revenueStats._sum.amount || 0,
      },
      charts: {
        dailyAverageLevels: recentDailyLevels,
        levelDistribution: levelRanges,
      },
      topGuilds: topGuilds.map(g => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        honor: g.honor,
        memberCount: g._count.members,
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        userEmail: t.user.email,
        amount: t.amount,
        currency: t.currency,
        type: t.transactionType,
        accountType: t.accountType,
        createdAt: t.createdAt,
        isProcessed: t.isProcessed,
      })),
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get database connection info
router.get('/connection', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    // Test connection with a simple query
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    
    const isProduction = process.env.USE_SSH_TUNNEL === 'true';
    
    res.json({
      status: 'connected',
      mode: isProduction ? 'production' : 'local',
      latency: `${latency}ms`,
    });
  } catch (error) {
    res.json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
