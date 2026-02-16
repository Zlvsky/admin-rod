import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

import { CharacterFull } from './types';
import { api } from '@/api/client';
import { formatNumber, formatDate } from '@/lib/utils';
import { 
  Trophy, 
  Swords, 
  Target, 
  TrendingUp, 
  Award,
  AlertCircle,
  Flame
} from 'lucide-react';

interface ArenaTabProps {
  character: CharacterFull;
  onUpdate: () => void;
}

export function ArenaTab({ character, onUpdate }: ArenaTabProps) {
  const queryClient = useQueryClient();
  const arenaRanking = character.arenaRanking;

  const [formData, setFormData] = useState({
    honor: arenaRanking?.honor ?? 0,
    totalWins: arenaRanking?.totalWins ?? 0,
    totalLosses: arenaRanking?.totalLosses ?? 0,
    winStreak: arenaRanking?.winStreak ?? 0,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.patch(`/characters/${character.id}/arena`, data);
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

  if (!arenaRanking) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-4">
        <AlertCircle className="h-8 w-8" />
        <p>No arena ranking data available for this character.</p>
      </div>
    );
  }

  const winRate = arenaRanking.totalWins + arenaRanking.totalLosses > 0
    ? ((arenaRanking.totalWins / (arenaRanking.totalWins + arenaRanking.totalLosses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* League Info */}
      <div className="p-6 border rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h3 className="text-xl font-bold">{arenaRanking.league?.name || 'Unknown League'}</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Level Range: {arenaRanking.league?.minLevel} - {arenaRanking.league?.maxLevel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">#{arenaRanking.rank}</p>
            <p className="text-sm text-muted-foreground">Current Rank</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <StatCard icon={Award} label="Honor" value={formatNumber(arenaRanking.honor)} color="text-purple-500" />
          <StatCard icon={Swords} label="Wins" value={formatNumber(arenaRanking.totalWins)} color="text-green-500" />
          <StatCard icon={Target} label="Losses" value={formatNumber(arenaRanking.totalLosses)} color="text-red-500" />
          <StatCard icon={Flame} label="Win Streak" value={arenaRanking.winStreak.toString()} color="text-orange-500" />
          <StatCard icon={TrendingUp} label="Win Rate" value={`${winRate}%`} color="text-blue-500" />
        </div>

        {arenaRanking.lastBattleAt && (
          <p className="text-xs text-muted-foreground mt-4">
            Last Battle: {formatDate(arenaRanking.lastBattleAt)}
          </p>
        )}
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Edit Arena Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="honor" className="flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              Honor
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
            <Label htmlFor="totalWins" className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-green-500" />
              Total Wins
            </Label>
            <Input
              id="totalWins"
              type="number"
              min="0"
              value={formData.totalWins}
              onChange={(e) => setFormData({ ...formData, totalWins: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalLosses" className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              Total Losses
            </Label>
            <Input
              id="totalLosses"
              type="number"
              min="0"
              value={formData.totalLosses}
              onChange={(e) => setFormData({ ...formData, totalLosses: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="winStreak" className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Win Streak
            </Label>
            <Input
              id="winStreak"
              type="number"
              min="0"
              value={formData.winStreak}
              onChange={(e) => setFormData({ ...formData, winStreak: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Arena Stats'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData({
              honor: arenaRanking.honor,
              totalWins: arenaRanking.totalWins,
              totalLosses: arenaRanking.totalLosses,
              winStreak: arenaRanking.winStreak,
            })}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: typeof Trophy; 
  label: string; 
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 bg-background rounded-lg">
      <Icon className={`h-5 w-5 ${color} mb-1`} />
      <span className="font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
