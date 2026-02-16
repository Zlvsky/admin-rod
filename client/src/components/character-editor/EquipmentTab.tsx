import { Badge } from '../ui/badge';
import { CharacterFull, ItemData } from './types';
import { 
  Shield, 
  Sword, 
  Footprints, 
  Shirt, 
  Crown, 
  CircleDot, 
  Gem,
  AlertCircle
} from 'lucide-react';

interface EquipmentTabProps {
  character: CharacterFull;
  onUpdate: () => void;
}

const QUALITY_NAMES: Record<number, string> = {
  0: 'Common',
  1: 'Uncommon',
  2: 'Rare',
  3: 'Epic',
  4: 'Legendary',
  5: 'Mythic',
};

const QUALITY_COLORS: Record<number, string> = {
  0: 'border-gray-400 bg-gray-500/10',
  1: 'border-green-400 bg-green-500/10',
  2: 'border-blue-400 bg-blue-500/10',
  3: 'border-purple-400 bg-purple-500/10',
  4: 'border-orange-400 bg-orange-500/10',
  5: 'border-red-400 bg-red-500/10',
};

const EQUIPMENT_SLOTS = [
  { key: 'headItem', label: 'Head', icon: Crown },
  { key: 'armorItem', label: 'Armor', icon: Shirt },
  { key: 'legsItem', label: 'Legs', icon: Footprints },
  { key: 'bootsItem', label: 'Boots', icon: Footprints },
  { key: 'weaponItem', label: 'Weapon', icon: Sword },
  { key: 'offhandItem', label: 'Offhand', icon: Shield },
  { key: 'necklaceItem', label: 'Necklace', icon: Gem },
  { key: 'ringItem', label: 'Ring', icon: CircleDot },
] as const;

export function EquipmentTab({ character }: EquipmentTabProps) {
  const equipment = character.equipment;

  if (!equipment) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-4">
        <AlertCircle className="h-8 w-8" />
        <p>No equipment data available for this character.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        View equipped items in all slots. Equipment management is read-only in admin panel.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {EQUIPMENT_SLOTS.map(({ key, label, icon: Icon }) => {
          const item = equipment[key] as ItemData | null;
          
          return (
            <EquipmentSlot
              key={key}
              label={label}
              icon={Icon}
              item={item}
            />
          );
        })}
      </div>

      {/* Stats Summary from Equipment */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-3">Equipment Stats Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Total Attack" value={calculateTotalStat(equipment, 'effect1')} />
          <StatBox label="Total Defense" value={calculateTotalStat(equipment, 'effect2')} />
          <StatBox label="Items Equipped" value={countEquippedItems(equipment)} />
          <StatBox label="Total Upgrades" value={calculateTotalStat(equipment, 'upgrade')} />
        </div>
      </div>
    </div>
  );
}

function EquipmentSlot({ 
  label, 
  icon: Icon, 
  item 
}: { 
  label: string; 
  icon: typeof Crown; 
  item: ItemData | null 
}) {
  if (!item) {
    return (
      <div className="flex flex-col items-center p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg">
        <Icon className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/70">Empty</span>
      </div>
    );
  }

  const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS[0];

  return (
    <div className={`flex flex-col p-4 border-2 rounded-lg ${qualityColor}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <Badge variant="outline" className="text-xs">
          {QUALITY_NAMES[item.quality] || 'Unknown'}
        </Badge>
      </div>
      <span className="font-medium text-sm truncate" title={item.name}>
        {item.name}
      </span>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xs text-muted-foreground">Lvl {item.requiredLevel}</span>
        {item.upgrade > 0 && (
          <Badge variant="secondary" className="text-xs">+{item.upgrade}</Badge>
        )}
      </div>
      {(item.effect1 > 0 || item.effect2 > 0) && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          {item.effect1 > 0 && <span className="text-green-500">+{item.effect1} ATK</span>}
          {item.effect2 > 0 && <span className="text-blue-500">+{item.effect2} DEF</span>}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function calculateTotalStat(equipment: NonNullable<CharacterFull['equipment']>, stat: keyof ItemData): number {
  let total = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    const item = equipment[slot.key] as ItemData | null;
    if (item && typeof item[stat] === 'number') {
      total += item[stat] as number;
    }
  }
  return total;
}

function countEquippedItems(equipment: NonNullable<CharacterFull['equipment']>): number {
  let count = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    if (equipment[slot.key]) {
      count++;
    }
  }
  return count;
}
