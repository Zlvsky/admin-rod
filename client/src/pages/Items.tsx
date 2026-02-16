import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi, Item } from '../api/client';
import { Button } from '../components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Trash2 } from 'lucide-react';

const ITEM_TYPES = ['weapon', 'armor', 'accessory', 'consumable', 'material'];
const QUALITY_OPTIONS = [
  { value: '0', label: 'Common' },
  { value: '1', label: 'Uncommon' },
  { value: '2', label: 'Rare' },
  { value: '3', label: 'Epic' },
  { value: '4', label: 'Legendary' },
  { value: '5', label: 'Mythic' },
];

export function Items() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, typeFilter, qualityFilter],
    queryFn: async () => {
      const response = await itemsApi.list({
        page,
        limit: 10,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        quality: qualityFilter !== 'all' ? parseInt(qualityFilter) : undefined,
      });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => itemsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setShowDeleteDialog(false);
      setSelectedItem(null);
    },
  });

  const QUALITY_NAMES: Record<number, string> = {
    0: 'Common',
    1: 'Uncommon', 
    2: 'Rare',
    3: 'Epic',
    4: 'Legendary',
    5: 'Mythic',
  };

  const getQualityVariant = (quality: number) => {
    switch (quality) {
      case 5: // Mythic
        return 'warning';
      case 4: // Legendary
        return 'warning';
      case 3: // Epic
        return 'destructive';
      case 2: // Rare
        return 'default';
      case 1: // Uncommon
        return 'success';
      default: // Common
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Items</h1>
        <p className="text-muted-foreground">Manage game items</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Qualities</SelectItem>
                {QUALITY_OPTIONS.map((quality) => (
                  <SelectItem key={quality.value} value={quality.value}>
                    {quality.label}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Req. Level</TableHead>
                    <TableHead>Upgrade</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getQualityVariant(item.quality)}>
                          {QUALITY_NAMES[item.quality] || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.requiredLevel}</TableCell>
                      <TableCell>+{item.upgrade || 0}</TableCell>
                      <TableCell>
                        {item.inventory?.character?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedItem?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedItem) {
                  deleteMutation.mutate(selectedItem.id);
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
