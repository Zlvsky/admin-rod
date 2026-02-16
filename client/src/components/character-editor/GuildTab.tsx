import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { CharacterFull } from './types';
import { api } from '@/api/client';
import { formatDate, formatNumber } from '@/lib/utils';
import { 
  Users, 
  Crown, 
  Shield, 
  Award, 
  Calendar,
  Coins,
  AlertCircle,
  UserMinus
} from 'lucide-react';

interface GuildTabProps {
  character: CharacterFull;
  onUpdate: () => void;
}

const RANK_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  LEADER: { label: 'Leader', variant: 'default' },
  OFFICER: { label: 'Officer', variant: 'secondary' },
  MEMBER: { label: 'Member', variant: 'secondary' },
};

export function GuildTab({ character, onUpdate }: GuildTabProps) {
  const queryClient = useQueryClient();
  const guildMember = character.guildMember;
  const [kickDialogOpen, setKickDialogOpen] = useState(false);

  const kickMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/characters/${character.id}/kick-from-guild`, { confirm: 'KICK' });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      setKickDialogOpen(false);
      onUpdate();
    },
  });

  if (!guildMember) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-4">
        <Users className="h-8 w-8" />
        <p>This character is not a member of any guild.</p>
      </div>
    );
  }

  const { guild } = guildMember;
  const rankInfo = RANK_BADGES[guildMember.rank] || RANK_BADGES.MEMBER;

  return (
    <div className="space-y-6">
      {/* Guild Info Card */}
      <div className="p-6 border rounded-lg bg-gradient-to-br from-muted/50 to-muted">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{guild.name}</h3>
              <Badge variant="outline">[{guild.tag}]</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={rankInfo.variant}>{rankInfo.label}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-5 w-5 text-yellow-500" />
            <span className="font-bold">{formatNumber(guild.honor)} Honor</span>
          </div>
        </div>

        {/* Guild Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <InfoCard icon={Crown} label="Rank" value={rankInfo.label} />
          <InfoCard icon={Calendar} label="Joined" value={formatDate(guildMember.joined)} />
          <InfoCard 
            icon={Coins} 
            label="Gold Donated" 
            value={formatNumber(guildMember.goldDonated)} 
          />
          <InfoCard 
            icon={Shield} 
            label="Coins Donated" 
            value={formatNumber(guildMember.coinsDonated)} 
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border rounded-lg">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Danger Zone
        </h4>
        <Button
          variant="destructive"
          onClick={() => setKickDialogOpen(true)}
          disabled={kickMutation.isPending}
        >
          <UserMinus className="h-4 w-4 mr-2" />
          {kickMutation.isPending ? 'Kicking...' : 'Kick from Guild'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This will remove the character from their current guild. This action cannot be undone.
        </p>
      </div>

      {/* Kick Confirmation Dialog */}
      <AlertDialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kick from Guild?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to kick <strong>{character.name}</strong> from <strong>{guild.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => kickMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Kick from Guild
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoCard({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: typeof Crown; 
  label: string; 
  value: string 
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
