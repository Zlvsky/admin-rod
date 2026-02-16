import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arenaApi, ArenaRanking } from '../api/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { formatNumber } from '@/lib/utils';
import { Trophy, Edit } from 'lucide-react';

export function Arena() {
  const [page, setPage] = useState(1);
  const [leagueFilter, setLeagueFilter] = useState<string>('all');
  const [selectedRanking, setSelectedRanking] = useState<ArenaRanking | null>(null);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [newRank, setNewRank] = useState('');
  const queryClient = useQueryClient();

  const { data: leagues } = useQuery({
    queryKey: ['arena-leagues'],
    queryFn: async () => {
      const response = await arenaApi.getLeagues();
      return response.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['arena-rankings', page, leagueFilter],
    queryFn: async () => {
      const response = await arenaApi.getRankings({
        page,
        limit: 10,
        leagueId: leagueFilter !== 'all' ? leagueFilter : undefined,
      });
      return response.data;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ characterId, newRank }: { characterId: string; newRank: number }) =>
      arenaApi.adjustRank(characterId, { newRank }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena-rankings'] });
      setShowAdjustDialog(false);
      setSelectedRanking(null);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Arena</h1>
        <p className="text-muted-foreground">Manage PvP rankings and leagues</p>
      </div>

      {/* Leagues Overview */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {leagues?.map((league) => (
          <Card key={league.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{league.name}</CardTitle>
              <Trophy className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Level: {league.minLevel} - {league.maxLevel}
              </p>
              {league.playerCount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Players: {league.playerCount}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
                {leagues?.map((league) => (
                  <SelectItem key={league.id} value={league.id.toString()}>
                    {league.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Character</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Honor</TableHead>
                    <TableHead>W/L</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((ranking) => (
                    <TableRow key={ranking.id}>
                      <TableCell className="font-medium">
                        #{ranking.rank}
                      </TableCell>
                      <TableCell>{ranking.character?.name}</TableCell>
                      <TableCell>{ranking.character?.level}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ranking.league?.name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatNumber(ranking.honor)}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{ranking.totalWins}</span>
                        {' / '}
                        <span className="text-red-600">{ranking.totalLosses}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRanking(ranking);
                            setNewRank(ranking.rank.toString());
                            setShowAdjustDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {data?.pagination?.totalPages || 1} ({data?.pagination?.total || 0} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (data?.pagination?.totalPages || 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Adjust Rank Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Ranking</DialogTitle>
            <DialogDescription>
              Change rank position for {selectedRanking?.character?.name}
              {selectedRanking && ` (current rank: #${selectedRanking.rank})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newRank">New Rank Position</Label>
              <Input
                id="newRank"
                type="number"
                min="1"
                value={newRank}
                onChange={(e) => setNewRank(e.target.value)}
                placeholder="Enter new rank position"
              />
              <p className="text-xs text-muted-foreground">
                The player at this position will swap ranks with {selectedRanking?.character?.name}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRanking && newRank) {
                  adjustMutation.mutate({
                    characterId: selectedRanking.characterId,
                    newRank: parseInt(newRank),
                  });
                }
              }}
              disabled={adjustMutation.isPending || !newRank}
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Rank'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
