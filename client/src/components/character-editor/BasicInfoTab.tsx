import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { CharacterFull } from './types';
import { api } from '@/api/client';
import { formatDate, formatNumber } from '@/lib/utils';
import { User, Calendar, Crown, Heart, Zap, Coins, Award } from 'lucide-react';

interface BasicInfoTabProps {
  character: CharacterFull;
  onUpdate: () => void;
}

export function BasicInfoTab({ character, onUpdate }: BasicInfoTabProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    level: character.level,
    experience: character.experience,
    gold: character.gold,
    coins: character.coins,
    honor: character.honor,
    stamina: character.stamina,
    health: character.health,
  });

  const [currencyToAdd, setCurrencyToAdd] = useState({ gold: 0, coins: 0 });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.patch(`/characters/${character.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      onUpdate();
    },
  });

  const addCurrencyMutation = useMutation({
    mutationFn: async (data: { gold?: number; coins?: number }) => {
      const response = await api.post(`/characters/${character.id}/add-currency`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      setCurrencyToAdd({ gold: 0, coins: 0 });
      onUpdate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleAddCurrency = () => {
    if (currencyToAdd.gold || currencyToAdd.coins) {
      addCurrencyMutation.mutate(currencyToAdd);
    }
  };

  return (
    <div className="space-y-6">
      {/* Character Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Owner</p>
            <p className="text-sm font-medium truncate">{character.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium">{formatDate(character.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Crown className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-xs text-muted-foreground">Premium</p>
            <Badge variant={character.isPremium ? 'default' : 'secondary'}>
              {character.isPremium ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Award className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Avatar</p>
            <p className="text-sm font-medium">#{character.avatarId}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Edit Character Stats</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Input
              id="level"
              type="number"
              min="1"
              max="500"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gold" className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-yellow-500" /> Gold
            </Label>
            <Input
              id="gold"
              type="number"
              min="0"
              value={formData.gold}
              onChange={(e) => setFormData({ ...formData, gold: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coins" className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-blue-500" /> Coins (Premium)
            </Label>
            <Input
              id="coins"
              type="number"
              min="0"
              value={formData.coins}
              onChange={(e) => setFormData({ ...formData, coins: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="honor" className="flex items-center gap-1">
              <Award className="h-4 w-4 text-purple-500" /> Honor
            </Label>
            <Input
              id="honor"
              type="number"
              min="0"
              value={formData.honor}
              onChange={(e) => setFormData({ ...formData, honor: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stamina" className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-green-500" /> Stamina
            </Label>
            <Input
              id="stamina"
              type="number"
              min="0"
              max="100"
              value={formData.stamina}
              onChange={(e) => setFormData({ ...formData, stamina: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health" className="flex items-center gap-1">
              <Heart className="h-4 w-4 text-red-500" /> Health
            </Label>
            <Input
              id="health"
              type="number"
              min="1"
              value={formData.health}
              onChange={(e) => setFormData({ ...formData, health: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>

      {/* Quick Actions - Add Currency */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">Quick Actions - Add Currency</h3>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="addGold">Add Gold</Label>
            <Input
              id="addGold"
              type="number"
              placeholder="Amount"
              value={currencyToAdd.gold || ''}
              onChange={(e) => setCurrencyToAdd({ ...currencyToAdd, gold: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addCoins">Add Coins</Label>
            <Input
              id="addCoins"
              type="number"
              placeholder="Amount"
              value={currencyToAdd.coins || ''}
              onChange={(e) => setCurrencyToAdd({ ...currencyToAdd, coins: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Button 
            onClick={handleAddCurrency} 
            disabled={addCurrencyMutation.isPending || (!currencyToAdd.gold && !currencyToAdd.coins)}
            variant="secondary"
          >
            {addCurrencyMutation.isPending ? 'Adding...' : 'Add Currency'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Current: {formatNumber(character.gold)} gold, {formatNumber(character.coins)} coins
        </p>
      </div>
    </div>
  );
}
