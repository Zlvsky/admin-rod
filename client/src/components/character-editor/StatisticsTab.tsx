import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CharacterFull } from './types';
import { api } from '@/api/client';
import { Swords, Shield, Heart, Target, Sparkles } from 'lucide-react';

interface StatisticsTabProps {
  character: CharacterFull;
  onUpdate: () => void;
}

export function StatisticsTab({ character, onUpdate }: StatisticsTabProps) {
  const queryClient = useQueryClient();
  const stats = character.statistics;

  const [formData, setFormData] = useState({
    strength: stats?.strength ?? 0,
    dexterity: stats?.dexterity ?? 0,
    constitution: stats?.constitution ?? 0,
    defense: stats?.defense ?? 0,
    luck: stats?.luck ?? 0,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.patch(`/characters/${character.id}/stats`, { stats: data });
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

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No statistics data available for this character.
      </div>
    );
  }

  const statFields = [
    { key: 'strength', label: 'Strength', icon: Swords, color: 'text-red-500', description: 'Increases physical damage' },
    { key: 'dexterity', label: 'Dexterity', icon: Target, color: 'text-green-500', description: 'Increases accuracy and critical chance' },
    { key: 'constitution', label: 'Constitution', icon: Heart, color: 'text-pink-500', description: 'Increases max health' },
    { key: 'defense', label: 'Defense', icon: Shield, color: 'text-blue-500', description: 'Reduces incoming damage' },
    { key: 'luck', label: 'Luck', icon: Sparkles, color: 'text-yellow-500', description: 'Increases drop rates and critical damage' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Edit character base statistics. These values affect combat performance and other game mechanics.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statFields.map(({ key, label, icon: Icon, color, description }) => (
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
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Statistics'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({
              strength: stats.strength,
              dexterity: stats.dexterity,
              constitution: stats.constitution,
              defense: stats.defense,
              luck: stats.luck,
            })}
          >
            Reset
          </Button>
        </div>
      </form>

      {/* Stats Summary */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-3">Current Statistics Summary</h4>
        <div className="grid grid-cols-5 gap-4 text-center">
          {statFields.map(({ key, label, icon: Icon, color }) => (
            <div key={key}>
              <Icon className={`h-6 w-6 mx-auto mb-1 ${color}`} />
              <p className="text-sm font-medium">{stats[key]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
