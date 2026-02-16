import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { charactersApi, Character } from '../api/client';
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
import { Search, Coins, Trash2 } from 'lucide-react';

export function Characters() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currency, setCurrency] = useState({ gold: '0', coins: '0', honor: '0' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['characters', page, search],
    queryFn: async () => {
      const response = await charactersApi.list({ page, limit: 10, search: search || undefined });
      return response.data;
    },
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: ({ id, currency }: { id: string; currency: { gold?: number; coins?: number; honor?: number } }) =>
      charactersApi.updateCurrency(id, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setShowCurrencyDialog(false);
      setSelectedCharacter(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => charactersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setShowDeleteDialog(false);
      setSelectedCharacter(null);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Characters</h1>
        <p className="text-muted-foreground">Manage player characters</p>
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
                    <TableHead>Level</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead>Coins</TableHead>
                    <TableHead>Honor</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((character) => (
                    <TableRow key={character.id}>
                      <TableCell className="font-medium">{character.name}</TableCell>
                      <TableCell>{character.level}</TableCell>
                      <TableCell>{formatNumber(character.gold)}</TableCell>
                      <TableCell>{formatNumber(character.coins)}</TableCell>
                      <TableCell>{formatNumber(character.honor)}</TableCell>
                      <TableCell>{(character as any).user?.email || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCharacter(character);
                              setCurrency({
                                gold: String(character.gold),
                                coins: String(character.coins),
                                honor: String(character.honor),
                              });
                              setShowCurrencyDialog(true);
                            }}
                          >
                            <Coins className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCharacter(character);
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

      {/* Currency Dialog */}
      <Dialog open={showCurrencyDialog} onOpenChange={setShowCurrencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Currency</DialogTitle>
            <DialogDescription>
              Update currency for {selectedCharacter?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gold">Gold</Label>
              <Input
                id="gold"
                type="number"
                value={currency.gold}
                onChange={(e) => setCurrency({ ...currency, gold: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coins">Coins</Label>
              <Input
                id="coins"
                type="number"
                value={currency.coins}
                onChange={(e) => setCurrency({ ...currency, coins: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="honor">Honor</Label>
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
                if (selectedCharacter) {
                  updateCurrencyMutation.mutate({
                    id: selectedCharacter.id,
                    currency: {
                      gold: parseInt(currency.gold),
                      coins: parseInt(currency.coins),
                      honor: parseInt(currency.honor),
                    },
                  });
                }
              }}
              disabled={updateCurrencyMutation.isPending}
            >
              {updateCurrencyMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCharacter?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedCharacter) {
                  deleteMutation.mutate(selectedCharacter.id);
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
