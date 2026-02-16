import { Router, Response } from 'express';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditAction } from '../middleware/audit.js';

const router = Router();

// List items with pagination (items in inventories)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const params = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
      search: z.string().optional(),
      type: z.string().optional(),
      minLevel: z.coerce.number().optional(),
      maxLevel: z.coerce.number().optional(),
      quality: z.coerce.number().min(0).max(5).optional(),
      inInventory: z.coerce.boolean().optional(),
    }).parse(req.query);
    
    const where: any = {};
    
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    
    if (params.type) {
      where.type = params.type;
    }
    
    if (params.minLevel) {
      where.requiredLevel = { gte: params.minLevel };
    }
    
    if (params.maxLevel) {
      where.requiredLevel = { ...where.requiredLevel, lte: params.maxLevel };
    }
    
    if (params.quality !== undefined) {
      where.quality = params.quality;
    }
    
    if (params.inInventory !== undefined) {
      where.inventoryId = params.inInventory ? { not: null } : null;
    }
    
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { id: 'desc' },
        include: {
          inventory: {
            select: {
              character: { select: { id: true, name: true } }
            }
          }
        }
      }),
      prisma.item.count({ where })
    ]);

    res.json({
      data: items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      }
    });
  } catch (error) {
    console.error('[Items] List error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get unique item types
router.get('/types', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    const types = await prisma.item.findMany({
      distinct: ['type'],
      select: { type: true }
    });

    res.json(types.map(t => t.type));
  } catch (error) {
    console.error('[Items] Types error:', error);
    res.status(500).json({ error: 'Failed to fetch item types' });
  }
});

// Get item by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        inventory: {
          include: { character: { select: { id: true, name: true } } }
        },
        mountInventory: {
          include: { character: { select: { id: true, name: true } } }
        },
        merchant: {
          include: { character: { select: { id: true, name: true } } }
        }
      }
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    console.error('[Items] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Update item
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    
    const data = z.object({
      name: z.string().optional(),
      type: z.string().optional(),
      description: z.string().optional(),
      count: z.coerce.number().min(1).optional(),
      requiredLevel: z.coerce.number().min(0).optional(),
      effect1: z.coerce.number().optional(),
      effect2: z.coerce.number().optional(),
      upgrade: z.coerce.number().min(0).optional(),
      quality: z.coerce.number().min(0).max(5).optional(),
      gold: z.coerce.number().min(0).optional(),
    }).parse(req.body);

    const current = await prisma.item.findUnique({
      where: { id },
      select: { name: true }
    });

    if (!current) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const updated = await prisma.item.update({
      where: { id },
      data,
    });

    logAuditAction(req.admin?.username || 'unknown', 'ITEM_UPDATE', {
      target: { type: 'item', id: id.toString(), name: current.name },
      changes: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { from: 'N/A', to: v }])),
      ip: req.ip || 'unknown',
    });

    res.json(updated);
  } catch (error) {
    console.error('[Items] Update error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Create item and add to character inventory
router.post('/create-for-character', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    
    const data = z.object({
      characterId: z.string(),
      name: z.string(),
      type: z.string(),
      description: z.string().default('Admin created item'),
      count: z.coerce.number().min(1).default(1),
      requiredLevel: z.coerce.number().min(0).default(0),
      effect1: z.coerce.number().default(0),
      effect2: z.coerce.number().default(0),
      assetId: z.coerce.number(),
      gold: z.coerce.number().min(0).default(0),
      quality: z.coerce.number().min(0).max(5).default(0),
      consumable: z.boolean().default(false),
    }).parse(req.body);

    // Get or create inventory
    let inventory = await prisma.inventory.findUnique({
      where: { characterId: data.characterId },
      select: { id: true, character: { select: { name: true } } }
    });

    if (!inventory) {
      inventory = await prisma.inventory.create({
        data: { characterId: data.characterId },
        select: { id: true, character: { select: { name: true } } }
      });
    }

    const { characterId, ...itemData } = data;

    const item = await prisma.item.create({
      data: {
        ...itemData,
        inventoryId: inventory.id,
      }
    });

    logAuditAction(req.admin?.username || 'unknown', 'ITEM_CREATE', {
      target: { type: 'character', id: characterId, name: inventory.character.name },
      metadata: { itemId: item.id, itemName: item.name, itemType: item.type },
      ip: req.ip || 'unknown',
    });

    res.json({
      success: true,
      item,
      message: `Created ${item.name} for ${inventory.character.name}`
    });
  } catch (error) {
    console.error('[Items] Create error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Delete item
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const id = parseInt(req.params.id, 10);
    const { confirm } = z.object({ confirm: z.literal('DELETE') }).parse(req.body);

    const item = await prisma.item.findUnique({
      where: { id },
      select: { name: true, type: true }
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    await prisma.item.delete({ where: { id } });

    logAuditAction(req.admin?.username || 'unknown', 'ITEM_DELETE', {
      target: { type: 'item', id: id.toString(), name: item.name },
      ip: req.ip || 'unknown',
    });

    res.json({ success: true, message: `Deleted item ${item.name}` });
  } catch (error) {
    console.error('[Items] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
