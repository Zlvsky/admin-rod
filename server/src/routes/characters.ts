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
    // Support both { stats: {...} } and direct {...} format
    const bodyData = req.body.stats || req.body;
    const data = updateStatsSchema.parse(bodyData);

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

// Add item to character inventory
router.post('/:id/add-item', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const itemData = z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      description: z.string().default('Admin created item'),
      count: z.coerce.number().min(1).default(1),
      requiredLevel: z.coerce.number().min(0).default(0),
      effect1: z.coerce.number().default(0),
      effect2: z.coerce.number().default(0),
      upgrade: z.coerce.number().min(0).default(0),
      assetId: z.coerce.number().default(1),
      gold: z.coerce.number().min(0).default(0),
      quality: z.coerce.number().min(0).max(5).default(0),
      consumable: z.boolean().default(false),
    }).parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, inventory: { select: { id: true } } }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    let inventoryId = character.inventory?.id;
    
    if (!inventoryId) {
      const newInventory = await prisma.inventory.create({
        data: { characterId: id },
        select: { id: true }
      });
      inventoryId = newInventory.id;
    }

    const item = await prisma.item.create({
      data: {
        ...itemData,
        inventoryId,
      }
    });

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_ADD_ITEM', {
      target: { type: 'character', id, name: character.name },
      metadata: { itemId: item.id, itemName: item.name, itemType: item.type },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, item, message: `Added ${item.name} to ${character.name}'s inventory` });
  } catch (error) {
    console.error('[Characters] Add item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Remove item from character inventory
router.delete('/:id/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id, itemId } = req.params;

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, inventory: { select: { id: true } } }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const item = await prisma.item.findFirst({
      where: { 
        id: parseInt(itemId),
        inventoryId: character.inventory?.id
      }
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found in inventory' });
      return;
    }

    await prisma.item.delete({ where: { id: item.id } });

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_REMOVE_ITEM', {
      target: { type: 'character', id, name: character.name },
      metadata: { itemId: item.id, itemName: item.name },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: `Removed ${item.name} from inventory` });
  } catch (error) {
    console.error('[Characters] Remove item error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Update village resources
router.patch('/:id/village', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const data = z.object({
      metal: z.coerce.number().min(0).optional(),
      stone: z.coerce.number().min(0).optional(),
      wood: z.coerce.number().min(0).optional(),
      rune1: z.coerce.number().min(0).optional(),
    }).parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, village: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (!character.village) {
      res.status(404).json({ error: 'Character has no village' });
      return;
    }

    const updated = await prisma.village.update({
      where: { characterId: id },
      data,
    });

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_UPDATE_VILLAGE', {
      target: { type: 'character', id, name: character.name },
      changes: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, { from: (character.village as any)[k], to: v }])
      ),
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Characters] Update village error:', error);
    res.status(500).json({ error: 'Failed to update village' });
  }
});

// Kick from guild
router.post('/:id/kick-from-guild', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { confirm } = z.object({ confirm: z.literal('KICK') }).parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { 
        name: true, 
        guildMember: { 
          select: { id: true, guild: { select: { name: true } } } 
        } 
      }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (!character.guildMember) {
      res.status(400).json({ error: 'Character is not in a guild' });
      return;
    }

    const guildName = character.guildMember.guild.name;

    await prisma.guildMember.delete({ where: { characterId: id } });

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_KICK_FROM_GUILD', {
      target: { type: 'character', id, name: character.name },
      metadata: { guildName },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: `Kicked ${character.name} from ${guildName}` });
  } catch (error) {
    console.error('[Characters] Kick from guild error:', error);
    res.status(500).json({ error: 'Failed to kick from guild' });
  }
});

// Update arena ranking
router.patch('/:id/arena', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const data = z.object({
      honor: z.coerce.number().min(0).optional(),
      totalWins: z.coerce.number().min(0).optional(),
      totalLosses: z.coerce.number().min(0).optional(),
      winStreak: z.coerce.number().min(0).optional(),
    }).parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, arenaRanking: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (!character.arenaRanking) {
      res.status(404).json({ error: 'Character has no arena ranking' });
      return;
    }

    const updated = await prisma.arenaRanking.update({
      where: { characterId: id },
      data,
      include: { league: true }
    });

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_UPDATE_ARENA', {
      target: { type: 'character', id, name: character.name },
      changes: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, { from: (character.arenaRanking as any)[k], to: v }])
      ),
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Characters] Update arena error:', error);
    res.status(500).json({ error: 'Failed to update arena ranking' });
  }
});

// Get inbox messages
router.get('/:id/inbox', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    const character = await prisma.character.findUnique({
      where: { id },
      select: { inbox: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json(character.inbox?.messages || []);
  } catch (error) {
    console.error('[Characters] Get inbox error:', error);
    res.status(500).json({ error: 'Failed to get inbox' });
  }
});

// Clear inbox
router.delete('/:id/inbox', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { confirm } = z.object({ confirm: z.literal('CLEAR') }).parse(req.body);

    const character = await prisma.character.findUnique({
      where: { id },
      select: { name: true, inbox: true }
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (character.inbox) {
      await prisma.inbox.update({
        where: { characterId: id },
        data: { messages: [] }
      });
    }

    logAuditAction(req.admin?.username || 'unknown', 'CHARACTER_CLEAR_INBOX', {
      target: { type: 'character', id, name: character.name },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: 'Inbox cleared' });
  } catch (error) {
    console.error('[Characters] Clear inbox error:', error);
    res.status(500).json({ error: 'Failed to clear inbox' });
  }
});

export default router;
