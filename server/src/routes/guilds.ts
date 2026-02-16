import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditAction } from '../middleware/audit.js';

const router = Router();

// List guilds with pagination
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const params = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
      sortBy: z.enum(['honor', 'createdAt', 'name', 'memberLimit']).default('honor'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }).parse(req.query);
    
    const where: any = {};
    
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { tag: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    
    const [guilds, total] = await Promise.all([
      prisma.guild.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          _count: { select: { members: true } },
          buildings: { select: { type: true, level: true } },
        }
      }),
      prisma.guild.count({ where })
    ]);

    res.json({
      data: guilds.map(g => ({
        ...g,
        memberCount: g._count.members,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    });
  } catch (error) {
    console.error('[Guilds] List error:', error);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Get guild details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);

    const guild = await prisma.guild.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            character: {
              select: { id: true, name: true, level: true, avatarId: true }
            }
          },
          orderBy: { rank: 'desc' }
        },
        buildings: true,
        raids: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { fight: true }
        },
        worldBosses: {
          orderBy: { id: 'desc' },
          take: 5,
        },
        messages: {
          orderBy: { timeSent: 'desc' },
          take: 20,
        },
        _count: {
          select: { invites: true, requests: true }
        }
      }
    });

    if (!guild) {
      res.status(404).json({ error: 'Guild not found' });
      return;
    }

    res.json(guild);
  } catch (error) {
    console.error('[Guilds] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch guild' });
  }
});

// Update guild
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    
    const data = z.object({
      name: z.string().min(3).max(20).optional(),
      tag: z.string().min(2).max(4).optional(),
      description: z.string().max(500).optional(),
      honor: z.coerce.number().min(0).optional(),
      gold: z.coerce.number().min(0).optional(),
      coins: z.coerce.number().min(0).optional(),
      tokens: z.coerce.number().min(0).optional(),
      memberLimit: z.coerce.number().min(5).max(50).optional(),
      status: z.enum(['OPEN', 'RECRUITING', 'CLOSED']).optional(),
    }).parse(req.body);

    const current = await prisma.guild.findUnique({
      where: { id },
      select: { name: true, tag: true, honor: true, gold: true, coins: true, tokens: true }
    });

    if (!current) {
      res.status(404).json({ error: 'Guild not found' });
      return;
    }

    const updated = await prisma.guild.update({
      where: { id },
      data,
    });

    logAuditAction(req.admin?.username || 'unknown', 'GUILD_UPDATE', {
      target: { type: 'guild', id: id.toString(), name: current.name },
      changes: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, { from: (current as any)[k], to: v }])
      ),
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Guilds] Update error:', error);
    res.status(500).json({ error: 'Failed to update guild' });
  }
});

// Kick guild member
router.post('/:id/kick-member', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const guildId = parseInt(req.params.id, 10);
    const { characterId } = z.object({ characterId: z.string() }).parse(req.body);

    const member = await prisma.guildMember.findUnique({
      where: { characterId },
      include: {
        character: { select: { name: true } },
        guild: { select: { name: true } }
      }
    });

    if (!member || member.guildId !== guildId) {
      res.status(404).json({ error: 'Member not found in this guild' });
      return;
    }

    await prisma.guildMember.delete({ where: { characterId } });

    logAuditAction(req.admin?.username || 'unknown', 'GUILD_KICK_MEMBER', {
      target: { type: 'guild', id: guildId.toString(), name: member.guild.name },
      metadata: { kickedCharacter: member.character.name, kickedCharacterId: characterId },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: `Kicked ${member.character.name} from ${member.guild.name}` });
  } catch (error) {
    console.error('[Guilds] Kick member error:', error);
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

// Change member rank
router.post('/:id/change-rank', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const guildId = parseInt(req.params.id, 10);
    const { characterId, rank } = z.object({
      characterId: z.string(),
      rank: z.enum(['MEMBER', 'OFFICER', 'LEADER']),
    }).parse(req.body);

    const member = await prisma.guildMember.findUnique({
      where: { characterId },
      include: {
        character: { select: { name: true } },
        guild: { select: { name: true } }
      }
    });

    if (!member || member.guildId !== guildId) {
      res.status(404).json({ error: 'Member not found in this guild' });
      return;
    }

    const oldRank = member.rank;

    // If promoting to LEADER, demote current leader to OFFICER
    if (rank === 'LEADER') {
      await prisma.guildMember.updateMany({
        where: { guildId, rank: 'LEADER' },
        data: { rank: 'OFFICER' }
      });
    }

    await prisma.guildMember.update({
      where: { characterId },
      data: { rank }
    });

    logAuditAction(req.admin?.username || 'unknown', 'GUILD_CHANGE_RANK', {
      target: { type: 'guild', id: guildId.toString(), name: member.guild.name },
      changes: { [member.character.name]: { from: oldRank, to: rank } },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: `Changed ${member.character.name}'s rank to ${rank}` });
  } catch (error) {
    console.error('[Guilds] Change rank error:', error);
    res.status(500).json({ error: 'Failed to change rank' });
  }
});

// Add currency to guild
router.post('/:id/add-currency', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    const { gold, coins, tokens } = z.object({
      gold: z.coerce.number().optional(),
      coins: z.coerce.number().optional(),
      tokens: z.coerce.number().optional(),
    }).parse(req.body);

    const guild = await prisma.guild.findUnique({
      where: { id },
      select: { name: true, gold: true, coins: true, tokens: true }
    });

    if (!guild) {
      res.status(404).json({ error: 'Guild not found' });
      return;
    }

    const updated = await prisma.guild.update({
      where: { id },
      data: {
        gold: gold ? { increment: gold } : undefined,
        coins: coins ? { increment: coins } : undefined,
        tokens: tokens ? { increment: tokens } : undefined,
      },
      select: { id: true, name: true, gold: true, coins: true, tokens: true }
    });

    logAuditAction(req.admin?.username || 'unknown', 'GUILD_ADD_CURRENCY', {
      target: { type: 'guild', id: id.toString(), name: guild.name },
      changes: {
        ...(gold ? { gold: { from: guild.gold, to: guild.gold + gold } } : {}),
        ...(coins ? { coins: { from: guild.coins, to: guild.coins + coins } } : {}),
        ...(tokens ? { tokens: { from: guild.tokens, to: guild.tokens + tokens } } : {}),
      },
      ip: req.ip || 'unknown',
    });

    res.json({
      success: true,
      guild: updated,
    });
  } catch (error) {
    console.error('[Guilds] Add currency error:', error);
    res.status(500).json({ error: 'Failed to add currency' });
  }
});

export default router;
