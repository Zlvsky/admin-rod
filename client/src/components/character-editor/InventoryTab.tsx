import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { CharacterFull, ItemData } from './types';
import { api } from '@/api/client';
import { Package, Plus, Trash2, AlertCircle } from 'lucide-react';

interface InventoryTabProps {
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
  0: 'bg-gray-500',
  1: 'bg-green-500',
  2: 'bg-blue-500',
  3: 'bg-purple-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
};

const ITEM_TYPES = [
  'head', 'armor', 'legs', 'boots', 'weapon', 'offhand', 
  'necklace', 'ring', 'consumable', 'material', 'quest'
];

export function InventoryTab({ character, onUpdate }: InventoryTabProps) {
  const queryClient = useQueryClient();
  const inventory = character.inventory;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'weapon',
    description: '',
    quality: 0,
    requiredLevel: 1,
    count: 1,
    effect1: 0,
    effect2: 0,
    assetId: 1,
    gold: 100,
    consumable: false,
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: typeof newItem) => {
      const response = await api.post(`/characters/${character.id}/add-item`, itemData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      setAddDialogOpen(false);
      setNewItem({
        name: '',
        type: 'weapon',
        description: '',
        quality: 0,
        requiredLevel: 1,
        count: 1,
        effect1: 0,
        effect2: 0,
        assetId: 1,
        gold: 100,
        consumable: false,
      });
      onUpdate();
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await api.delete(`/characters/${character.id}/items/${itemId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      onUpdate();
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItemMutation.mutate(newItem);
  };

  if (!inventory) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-4">
        <AlertCircle className="h-8 w-8" />
        <p>No inventory data available for this character.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inventory Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <span className="font-medium">
            Inventory ({inventory.items.length}/{inventory.maxItems} items)
          </span>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Item to Inventory</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="itemName">Name</Label>
                  <Input
                    id="itemName"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Item name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemType">Type</Label>
                  <Select value={newItem.type} onValueChange={(v) => setNewItem({ ...newItem, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemQuality">Quality</Label>
                  <Select 
                    value={newItem.quality.toString()} 
                    onValueChange={(v) => setNewItem({ ...newItem, quality: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUALITY_NAMES).map(([value, name]) => (
                        <SelectItem key={value} value={value}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requiredLevel">Required Level</Label>
                  <Input
                    id="requiredLevel"
                    type="number"
                    min="1"
                    value={newItem.requiredLevel}
                    onChange={(e) => setNewItem({ ...newItem, requiredLevel: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemCount">Count</Label>
                  <Input
                    id="itemCount"
                    type="number"
                    min="1"
                    value={newItem.count}
                    onChange={(e) => setNewItem({ ...newItem, count: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effect1">Effect 1</Label>
                  <Input
                    id="effect1"
                    type="number"
                    value={newItem.effect1}
                    onChange={(e) => setNewItem({ ...newItem, effect1: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effect2">Effect 2</Label>
                  <Input
                    id="effect2"
                    type="number"
                    value={newItem.effect2}
                    onChange={(e) => setNewItem({ ...newItem, effect2: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assetId">Asset ID</Label>
                  <Input
                    id="assetId"
                    type="number"
                    min="1"
                    value={newItem.assetId}
                    onChange={(e) => setNewItem({ ...newItem, assetId: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gold">Gold Value</Label>
                  <Input
                    id="gold"
                    type="number"
                    min="0"
                    value={newItem.gold}
                    onChange={(e) => setNewItem({ ...newItem, gold: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Item description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addItemMutation.isPending}>
                  {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        {inventory.items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Inventory is empty
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {inventory.items.map((item: ItemData) => (
              <ItemCard
                key={item.id}
                item={item}
                onRemove={() => removeItemMutation.mutate(item.id)}
                isRemoving={removeItemMutation.isPending}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ItemCard({ 
  item, 
  onRemove, 
  isRemoving 
}: { 
  item: ItemData; 
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-10 rounded ${QUALITY_COLORS[item.quality] || 'bg-gray-500'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            {item.count > 1 && <Badge variant="secondary">x{item.count}</Badge>}
            {item.upgrade > 0 && <Badge variant="outline">+{item.upgrade}</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{item.type}</span>
            <span>•</span>
            <span>{QUALITY_NAMES[item.quality] || 'Unknown'}</span>
            <span>•</span>
            <span>Lvl {item.requiredLevel}</span>
            {item.effect1 > 0 && (
              <>
                <span>•</span>
                <span>+{item.effect1} ATK</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={onRemove}
        disabled={isRemoving}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
