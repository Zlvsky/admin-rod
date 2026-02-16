import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { CharacterFull } from './types';
import { BasicInfoTab } from './BasicInfoTab';
import { StatisticsTab } from './StatisticsTab';
import { InventoryTab } from './InventoryTab';
import { EquipmentTab } from './EquipmentTab';
import { VillageTab } from './VillageTab';
import { GuildTab } from './GuildTab';
import { ArenaTab } from './ArenaTab';
import { InboxTab } from './InboxTab';
import { api } from '@/api/client';
import { 
  User, 
  BarChart3, 
  Package, 
  Shirt, 
  Building2, 
  Users, 
  Trophy, 
  Mail,
  Loader2 
} from 'lucide-react';

interface CharacterEditDialogProps {
  characterId: string | null;
  characterName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CharacterEditDialog({
  characterId,
  characterName,
  open,
  onOpenChange,
}: CharacterEditDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');

  const { data: character, isLoading, error, refetch } = useQuery<CharacterFull>({
    queryKey: ['character', characterId],
    queryFn: async () => {
      if (!characterId) throw new Error('No character ID');
      const response = await api.get(`/characters/${characterId}`);
      return response.data;
    },
    enabled: !!characterId && open,
  });

  const handleUpdate = () => {
    refetch();
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'equipment', label: 'Equipment', icon: Shirt },
    { id: 'village', label: 'Village', icon: Building2 },
    { id: 'guild', label: 'Guild', icon: Users },
    { id: 'arena', label: 'Arena', icon: Trophy },
    { id: 'inbox', label: 'Inbox', icon: Mail },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Character: {character?.name || characterName || 'Loading...'}
            {character && (
              <Badge variant="secondary">Level {character.level}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-destructive">
            Failed to load character data. Please try again.
          </div>
        ) : character ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-8 w-full">
              {tabs.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="flex items-center gap-1 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              <div className="pr-4">
                <TabsContent value="basic" className="mt-0">
                  <BasicInfoTab character={character} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="stats" className="mt-0">
                  <StatisticsTab character={character} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="inventory" className="mt-0">
                  <InventoryTab character={character} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="equipment" className="mt-0">
                  <EquipmentTab character={character} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="village" className="mt-0">
                  <VillageTab character={character} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="guild" className="mt-0">
                  <GuildTab character={character} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="arena" className="mt-0">
                  <ArenaTab character={character} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="inbox" className="mt-0">
                  <InboxTab character={character} onUpdate={handleUpdate} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
