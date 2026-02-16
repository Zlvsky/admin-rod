import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditAction } from '../middleware/audit.js';

const router = Router();

// Get all arena leagues
router.get('/leagues', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    const leagues = await prisma.arenaLeague.findMany({
      orderBy: { minLevel: 'asc' },
      include: {
        _count: { select: { rankings: true, battles: true } }
      }
    });

    res.json(leagues.map(l => ({
      ...l,
      playerCount: l._count.rankings,
      battleCount: l._count.battles,
    })));
  } catch (error) {
    console.error('[Arena] Leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Get all rankings (across leagues or filtered by league)
router.get('/rankings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    const params = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
      leagueId: z.string().optional(),
    }).parse(req.query);
    
    const where: any = {};
    if (params.leagueId) {
      where.leagueId = parseInt(params.leagueId, 10);
    }
    
    const [rankings, total] = await Promise.all([
      prisma.arenaRanking.findMany({
        where,
        orderBy: [
          { leagueId: 'asc' },
          { rank: 'asc' }
        ],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          character: {
            select: { id: true, name: true, level: true, avatarId: true }
          },
          league: {
            select: { id: true, name: true, minLevel: true, maxLevel: true }
          }
        }
      }),
      prisma.arenaRanking.count({ where })
    ]);

    res.json({
      data: rankings,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    });
  } catch (error) {
    console.error('[Arena] Rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Get league rankings
router.get('/leagues/:id/rankings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const leagueId = parseInt(req.params.id, 10);
    
    const params = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    }).parse(req.query);
    
    const [rankings, total, league] = await Promise.all([
      prisma.arenaRanking.findMany({
        where: { leagueId },
        orderBy: { rank: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          character: {
            select: { id: true, name: true, level: true, avatarId: true }
          }
        }
      }),
      prisma.arenaRanking.count({ where: { leagueId } }),
      prisma.arenaLeague.findUnique({ where: { id: leagueId } })
    ]);

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    res.json({
      league,
      data: rankings,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    });
  } catch (error) {
    console.error('[Arena] Rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Update league settings
router.patch('/leagues/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    
    const data = z.object({
      name: z.string().optional(),
      hourlyGold: z.coerce.number().min(0).optional(),
      potIncrement: z.coerce.number().min(0).optional(),
      currentPot: z.coerce.number().min(0).optional(),
    }).parse(req.body);

    const league = await prisma.arenaLeague.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!league) {
      res.status(404).json({ error: 'League not found' });
      return;
    }

    const updated = await prisma.arenaLeague.update({
      where: { id },
      data,
    });

    logAuditAction(req.admin?.username || 'unknown', 'ARENA_LEAGUE_UPDATE', {
      target: { type: 'arena_league', id: id.toString(), name: league.name },
      changes: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { to: v }])),
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Arena] League update error:', error);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// Get recent battles
router.get('/battles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    const params = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      leagueId: z.coerce.number().optional(),
    }).parse(req.query);
    
    const where: any = {};
    if (params.leagueId) {
      where.leagueId = params.leagueId;
    }
    
    const [battles, total] = await Promise.all([
      prisma.arenaBattle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          league: { select: { name: true } },
          attacker: {
            select: { character: { select: { id: true, name: true } } }
          },
          defender: {
            select: { character: { select: { id: true, name: true } } }
          }
        }
      }),
      prisma.arenaBattle.count({ where })
    ]);

    res.json({
      data: battles.map(b => ({
        ...b,
        attackerName: b.attacker.character.name,
        defenderName: b.defender.character.name,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    });
  } catch (error) {
    console.error('[Arena] Battles error:', error);
    res.status(500).json({ error: 'Failed to fetch battles' });
  }
});

// Adjust player ranking
router.post('/rankings/:characterId/adjust', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { characterId } = req.params;
    
    const { newRank } = z.object({
      newRank: z.coerce.number().min(1),
    }).parse(req.body);

    const ranking = await prisma.arenaRanking.findUnique({
      where: { characterId },
      include: {
        character: { select: { name: true } },
        league: { select: { name: true } }
      }
    });

    if (!ranking) {
      res.status(404).json({ error: 'Ranking not found' });
      return;
    }

    const oldRank = ranking.rank;

    // Swap ranks with the player at newRank
    const targetRanking = await prisma.arenaRanking.findFirst({
      where: { leagueId: ranking.leagueId, rank: newRank }
    });

    if (targetRanking) {
      // Swap ranks
      await prisma.$transaction([
        prisma.arenaRanking.update({
          where: { characterId },
          data: { rank: -1 } // Temporary
        }),
        prisma.arenaRanking.update({
          where: { characterId: targetRanking.characterId },
          data: { rank: oldRank }
        }),
        prisma.arenaRanking.update({
          where: { characterId },
          data: { rank: newRank }
        }),
      ]);
    } else {
      // Just set the rank
      await prisma.arenaRanking.update({
        where: { characterId },
        data: { rank: newRank }
      });
    }

    logAuditAction(req.admin?.username || 'unknown', 'ARENA_RANK_ADJUST', {
      target: { type: 'character', id: characterId, name: ranking.character.name },
      changes: { rank: { from: oldRank, to: newRank } },
      metadata: { league: ranking.league.name },
      ip: req.ip || 'unknown',
    });

    res.json({
      success: true,
      message: `Moved ${ranking.character.name} from rank ${oldRank} to ${newRank}`
    });
  } catch (error) {
    console.error('[Arena] Adjust ranking error:', error);
    res.status(500).json({ error: 'Failed to adjust ranking' });
  }
});

export default router;
