import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { UserFull, UserCharacter } from './types';
import { CharacterEditDialog } from '../character-editor/CharacterEditDialog';
import { formatDate } from '@/lib/utils';
import { 
  User,
  Swords,
  Coins,
  Shield,
  Users,
  Edit,
  Crown,
  TrendingUp
} from 'lucide-react';

interface CharactersTabProps {
  user: UserFull;
  onUpdate: () => void;
}

export function CharactersTab({ user, onUpdate }: CharactersTabProps) {
  const [editCharacterId, setEditCharacterId] = useState<string | null>(null);
  const [editCharacterName, setEditCharacterName] = useState<string>('');

  const handleEditCharacter = (character: UserCharacter) => {
    setEditCharacterId(character.id);
    setEditCharacterName(character.name);
  };

  const handleCloseDialog = () => {
    setEditCharacterId(null);
    setEditCharacterName('');
    onUpdate(); // Refresh user data after editing a character
  };

  if (user.characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Characters</p>
        <p className="text-sm">This user hasn't created any characters yet.</p>
      </div>
    );
  }

  // Calculate totals
  const totalGold = user.characters.reduce((sum, c) => sum + c.gold, 0);
  const totalCoins = user.characters.reduce((sum, c) => sum + c.coins, 0);
  const totalHonor = user.characters.reduce((sum, c) => sum + c.honor, 0);
  const highestLevel = Math.max(...user.characters.map(c => c.level));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Characters</p>
            <p className="text-sm font-medium">{user.characters.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Highest Level</p>
            <p className="text-sm font-medium">{highestLevel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Coins className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-xs text-muted-foreground">Total Gold</p>
            <p className="text-sm font-medium">{totalGold.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Total Honor</p>
            <p className="text-sm font-medium">{totalHonor.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Characters Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Character</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Gold / Coins</TableHead>
              <TableHead>Guild</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {user.characters.map((character) => (
              <TableRow key={character.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{character.name}</span>
                        {character.isPremium && (
                          <Crown className="h-3.5 w-3.5 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(character.createdAt)}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    Lv. {character.level}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="text-yellow-500">{character.gold.toLocaleString()}</span>
                    {' / '}
                    <span className="text-blue-500">{character.coins.toLocaleString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {character.guildMember ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        [{character.guildMember.guild.tag}] {character.guildMember.guild.name}
                      </span>
                      <Badge variant="outline" className="text-xs ml-1">
                        {character.guildMember.rank}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No guild</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Swords className="h-3 w-3" />
                      <span>{character._count.quests} quests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>{character._count.stages} stages</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCharacter(character)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals Footer */}
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Account Totals</h4>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-muted-foreground">Total Gold</p>
            <p className="font-bold text-yellow-500">{totalGold.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Coins</p>
            <p className="font-bold text-blue-500">{totalCoins.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Honor</p>
            <p className="font-bold">{totalHonor.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Character Edit Dialog */}
      <CharacterEditDialog
        characterId={editCharacterId}
        characterName={editCharacterName}
        open={!!editCharacterId}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />
    </div>
  );
}
