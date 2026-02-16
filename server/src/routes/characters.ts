import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditAction } from '../middleware/audit.js';

const router = Router();

// Validation schemas
const listCharactersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  minLevel: z.coerce.number().optional(),
  maxLevel: z.coerce.number().optional(),
  guildId: z.coerce.number().optional(),
  sortBy: z.enum(['level', 'createdAt', 'name', 'gold', 'honor']).default('level'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateCharacterSchema = z.object({
  level: z.coerce.number().min(1).max(500).optional(),
  experience: z.coerce.number().min(0).optional(),
  gold: z.coerce.number().min(0).optional(),
  coins: z.coerce.number().min(0).optional(),
  honor: z.coerce.number().min(0).optional(),
  stamina: z.coerce.number().min(0).max(100).optional(),
  health: z.coerce.number().min(1).optional(),
  isPremium: z.boolean().optional(),
});

const updateStatsSchema = z.object({
  strength: z.coerce.number().min(0).optional(),
  dexterity: z.coerce.number().min(0).optional(),
  constitution: z.coerce.number().min(0).optional(),
  defense: z.coerce.number().min(0).optional(),
  luck: z.coerce.number().min(0).optional(),
});

// List characters with pagination
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const params = listCharactersSchema.parse(req.query);
    
    const where: any = {};
    
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    
    if (params.minLevel) {
      where.level = { ...where.level, gte: params.minLevel };
    }
    
    if (params.maxLevel) {
      where.level = { ...where.level, lte: params.maxLevel };
    }
    
    if (params.guildId) {
      where.guildMember = { guildId: params.guildId };
    }
    
    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        select: {
          id: true,
          name: true,
          level: true,
          experience: true,
          gold: true,
          coins: true,
          honor: true,
          stamina: true,
          health: true,
          isPremium: true,
          createdAt: true,
          avatarId: true,
          user: { select: { id: true, email: true } },
          guildMember: {
            select: {
              rank: true,
              guild: { select: { id: true, name: true, tag: true } }
            }
          },
          statistics: true,
        }
      }),
      prisma.character.count({ where })
    ]);

    res.json({
      data: characters,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    });
  } catch (error) {
    console.error('[Characters] List error:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Get single character with full details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, premiumExpiresAt: true } },
        statistics: true,
        equipment: {
          include: {
            headItem: true,
            armorItem: true,
            legsItem: true,
            bootsItem: true,
            weaponItem: true,
            offhandItem: true,
            necklaceItem: true,
            ringItem: true,
          }
        },
        inventory: {
          include: { items: true }
        },
        mountInventory: {
          include: { items: true }
        },
        guildMember: {
          include: {
            guild: {
              select: { id: true, name: true, tag: true, honor: true }
            }
          }
        },
        dungeon: {
          include: { checkpoints: true }
        },
        corruptedDungeon: {
          include: { checkpoints: true }
        },
        depths: true,
        missions: true,
        village: {
          include: { buildings: true, enchants: true }
        },
        homestead: {
          include: {
            activities: true,
            buildings: true,
            resources: true,
            workers: true,
          }
        },
        arenaRanking: {
          include: { league: true }
        },
        stages: {
          include: { checkpoints: true },
          orderBy: { location: 'desc' },
          take: 5,
        },
        _count: {
          select: { quests: true, bestiary: true }
        }
      }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json(character);
  } catch (error) {
    console.error('[Characters] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

// Update character basic info
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const data = updateCharacterSchema.parse(req.body);

    const current = await prisma.character.findUnique({
      where: { id },
      select: { name: true, level: true, gold: true, coins: true, honor: true, stamina: true, health: true, isPremium: true }
    });

    if (!current) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const updated = await prisma.character.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        level: true,
        experience: true,
        gold: true,
        coins: true,
        honor: true,
        stamina: true,
        health: true,
        isPremium: true,
      }
    });

    // Build changes object
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data) as Array<keyof typeof data>) {
      if (data[key] !== undefined && current[key as keyof typeof current] !== data[key]) {
        changes[key] = { from: current[key as keyof typeof current], to: data[key] };
      }
    }

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_UPDATE', {
      target: { type: 'character', id, name: current.name },
      changes,
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Characters] Update error:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// Update character statistics
router.patch('/:id/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const data = updateStatsSchema.parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, statistics: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (!character.statistics) {
      res.status(404).json({ error: 'Character statistics not found' });
      return;
    }

    const updated = await prisma.statistics.update({
      where: { characterId: id },
      data,
    });

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data) as Array<keyof typeof data>) {
      if (data[key] !== undefined) {
        changes[key] = { 
          from: character.statistics[key as keyof typeof character.statistics], 
          to: data[key] 
        };
      }
    }

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_STATS_UPDATE', {
      target: { type: 'character', id, name: character.name },
      changes,
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Characters] Update stats error:', error);
    res.status(500).json({ error: 'Failed to update character statistics' });
  }
});

// Add gold/coins to character
router.post('/:id/add-currency', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { gold, coins } = z.object({
      gold: z.coerce.number().optional(),
      coins: z.coerce.number().optional(),
    }).parse(req.body);

    if (!gold && !coins) {
      res.status(400).json({ error: 'Specify gold or coins amount' });
      return;
    }

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, gold: true, coins: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const updated = await prisma.character.update({
      where: { id },
      data: {
        gold: gold ? { increment: gold } : undefined,
        coins: coins ? { increment: coins } : undefined,
      },
      select: { id: true, name: true, gold: true, coins: true }
    });

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_ADD_CURRENCY', {
      target: { type: 'character', id, name: character.name },
      changes: {
        ...(gold ? { gold: { from: character.gold, to: character.gold + gold } } : {}),
        ...(coins ? { coins: { from: character.coins, to: character.coins + coins } } : {}),
      },
      ip: req.ip || 'unknown',
    });

    res.json({
      success: true,
      character: updated,
      message: `Added ${gold || 0} gold and ${coins || 0} coins`
    });
  } catch (error) {
    console.error('[Characters] Add currency error:', error);
    res.status(500).json({ error: 'Failed to add currency' });
  }
});

// Send inbox message to character
router.post('/:id/send-message', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { title, message, type } = z.object({
      title: z.string().min(1).max(100),
      message: z.string().min(1).max(1000),
      type: z.enum(['MESSAGE', 'SYSTEM']).default('SYSTEM'),
    }).parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, inbox: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const newMessage = {
      id: crypto.randomUUID(),
      title,
      message,
      type,
      from: 'SYSTEM',
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (character.inbox) {
      await prisma.inbox.update({
        where: { characterId: id },
        data: {
          messages: {
            push: newMessage
          }
        }
      });
    } else {
      await prisma.inbox.create({
        data: {
          characterId: id,
          messages: [newMessage]
        }
      });
    }

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_SEND_MESSAGE', {
      target: { type: 'character', id, name: character.name },
      metadata: { title, type },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('[Characters] Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Reset character progress (dungeons, stages, etc.)
router.post('/:id/reset-progress', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { type, confirm } = z.object({
      type: z.enum(['dungeons', 'depths', 'stages', 'all']),
      confirm: z.literal('RESET'),
    }).parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const operations: Promise<any>[] = [];

    if (type === 'dungeons' || type === 'all') {
      operations.push(
        prisma.dungeonCheckpoint.deleteMany({ where: { dungeon: { characterId: id } } }),
        prisma.dungeon.deleteMany({ where: { characterId: id } }),
        prisma.dungeonCheckpoint.deleteMany({ where: { corruptedDungeon: { characterId: id } } }),
        prisma.corruptedDungeon.deleteMany({ where: { characterId: id } })
      );
    }

    if (type === 'depths' || type === 'all') {
      operations.push(
        prisma.depths.deleteMany({ where: { characterId: id } })
      );
    }

    if (type === 'stages' || type === 'all') {
      operations.push(
        prisma.checkpoint.deleteMany({ where: { stage: { characterId: id } } }),
        prisma.stage.deleteMany({ where: { characterId: id } })
      );
    }

    await Promise.all(operations);

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_RESET_PROGRESS', {
      target: { type: 'character', id, name: character.name },
      metadata: { resetType: type },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: `Reset ${type} progress for ${character.name}` });
  } catch (error) {
    console.error('[Characters] Reset progress error:', error);
    res.status(500).json({ error: 'Failed to reset progress' });
  }
});

export default router;
