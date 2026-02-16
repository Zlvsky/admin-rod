import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { CharacterFull, VillageBuilding } from './types';
import { api } from '@/api/client';
import { formatNumber, formatDate } from '@/lib/utils';
import { 
  Hammer, 
  Mountain, 
  Trees, 
  Sparkles, 
  Building2,
  AlertCircle
} from 'lucide-react';

interface VillageTabProps {
  character: CharacterFull;
  onUpdate: () => void;
}

export function VillageTab({ character, onUpdate }: VillageTabProps) {
  const queryClient = useQueryClient();
  const village = character.village;

  const [formData, setFormData] = useState({
    metal: village?.metal ?? 0,
    stone: village?.stone ?? 0,
    wood: village?.wood ?? 0,
    rune1: village?.rune1 ?? 0,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.patch(`/characters/${character.id}/village`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      onUpdate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!village) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-4">
        <AlertCircle className="h-8 w-8" />
        <p>No village data available for this character.</p>
      </div>
    );
  }

  const resources = [
    { key: 'metal', label: 'Metal', icon: Hammer, color: 'text-gray-500' },
    { key: 'stone', label: 'Stone', icon: Mountain, color: 'text-slate-500' },
    { key: 'wood', label: 'Wood', icon: Trees, color: 'text-amber-600' },
    { key: 'rune1', label: 'Runes', icon: Sparkles, color: 'text-purple-500' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Current Resources Display */}
      <div className="grid grid-cols-4 gap-4">
        {resources.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="flex flex-col items-center p-4 bg-muted rounded-lg">
            <Icon className={`h-6 w-6 ${color} mb-2`} />
            <span className="text-lg font-bold">{formatNumber(village[key])}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Edit Resources Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Edit Village Resources</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {resources.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </Label>
              <Input
                id={key}
                type="number"
                min="0"
                value={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: parseInt(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Resources'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({
              metal: village.metal,
              stone: village.stone,
              wood: village.wood,
              rune1: village.rune1,
            })}
          >
            Reset
          </Button>
        </div>
      </form>

      {/* Buildings List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Village Buildings ({village.buildings.length})
        </h3>
        
        {village.buildings.length === 0 ? (
          <p className="text-muted-foreground">No buildings constructed yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {village.buildings.map((building: VillageBuilding) => (
              <BuildingCard key={building.id} building={building} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BuildingCard({ building }: { building: VillageBuilding }) {
  const isBuilding = building.buildFinish && new Date(building.buildFinish) > new Date();

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{building.name}</span>
        <Badge variant={isBuilding ? 'secondary' : 'default'}>
          Level {building.level}
        </Badge>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>Resources: {formatNumber(building.resources)}</p>
        <p>Last Claimed: {formatDate(building.lastClaimed)}</p>
        {isBuilding && (
          <p className="text-yellow-500">
            Upgrading until: {formatDate(building.buildFinish!)}
          </p>
        )}
      </div>
    </div>
  );
}
