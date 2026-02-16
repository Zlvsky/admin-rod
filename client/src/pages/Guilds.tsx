import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guildsApi, Guild } from '../api/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader } from '../components/ui/card';
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
import { formatNumber } from '@/lib/utils';
import { Search, Coins, Trash2, Users } from 'lucide-react';

export function Guilds() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [currency, setCurrency] = useState({ gold: '0', honor: '0' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['guilds', page, search],
    queryFn: async () => {
      const response = await guildsApi.list({ page, limit: 10, search: search || undefined });
      return response.data;
    },
  });

  const addCurrencyMutation = useMutation({
    mutationFn: ({ id, currency }: { id: string; currency: { gold?: number; honor?: number } }) =>
      guildsApi.addCurrency(id, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      setShowCurrencyDialog(false);
      setSelectedGuild(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => guildsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      setShowDeleteDialog(false);
      setSelectedGuild(null);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Guilds</h1>
        <p className="text-muted-foreground">Manage guilds</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead>Honor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((guild) => (
                    <TableRow key={guild.id}>
                      <TableCell className="font-medium">{guild.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">[{guild.tag}]</Badge>
                      </TableCell>
                      <TableCell>{guild.level}</TableCell>
                      <TableCell>{(guild as any).memberCount || 0}</TableCell>
                      <TableCell>{formatNumber(guild.gold)}</TableCell>
                      <TableCell>{formatNumber(guild.honor)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGuild(guild);
                              setShowMembersDialog(true);
                            }}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGuild(guild);
                              setCurrency({ gold: '0', honor: '0' });
                              setShowCurrencyDialog(true);
                            }}
                          >
                            <Coins className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGuild(guild);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Guild Members - {selectedGuild?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Character</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Rank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGuild?.members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.character?.name}</TableCell>
                    <TableCell>{member.character?.level}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.rank}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Currency Dialog */}
      <Dialog open={showCurrencyDialog} onOpenChange={setShowCurrencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
            <DialogDescription>
              Add currency to {selectedGuild?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gold">Gold (can be negative to subtract)</Label>
              <Input
                id="gold"
                type="number"
                value={currency.gold}
                onChange={(e) => setCurrency({ ...currency, gold: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="honor">Honor (can be negative to subtract)</Label>
              <Input
                id="honor"
                type="number"
                value={currency.honor}
                onChange={(e) => setCurrency({ ...currency, honor: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCurrencyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedGuild) {
                  addCurrencyMutation.mutate({
                    id: selectedGuild.id,
                    currency: {
                      gold: parseInt(currency.gold),
                      honor: parseInt(currency.honor),
                    },
                  });
                }
              }}
              disabled={addCurrencyMutation.isPending}
            >
              {addCurrencyMutation.isPending ? 'Adding...' : 'Add Currency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Guild</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedGuild?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedGuild) {
                  deleteMutation.mutate(selectedGuild.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
