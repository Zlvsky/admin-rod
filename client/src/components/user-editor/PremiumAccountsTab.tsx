import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { UserFull, PremiumAccount } from './types';
import { api } from '@/api/client';
import { formatDate } from '@/lib/utils';
import { 
  CreditCard, 
  Plus, 
  Pencil, 
  Trash2,
  CheckCircle,
  XCircle,
  Coffee,
  Heart
} from 'lucide-react';

interface PremiumAccountsTabProps {
  user: UserFull;
  onUpdate: () => void;
}

const ACCOUNT_TYPE_INFO = {
  BUYMEACOFFEE: { label: 'Buy Me A Coffee', icon: Coffee, color: 'text-yellow-500' },
  PATREON: { label: 'Patreon', icon: Heart, color: 'text-red-500' },
};

export function PremiumAccountsTab({ user, onUpdate }: PremiumAccountsTabProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PremiumAccount | null>(null);
  const [formData, setFormData] = useState({
    accountType: 'BUYMEACOFFEE' as 'BUYMEACOFFEE' | 'PATREON',
    accountEmail: '',
    isVerified: false,
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post(`/users/${user.id}/premium-accounts`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      setShowAddDialog(false);
      resetForm();
      onUpdate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      const response = await api.patch(`/users/${user.id}/premium-accounts/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      setShowEditDialog(false);
      setSelectedAccount(null);
      resetForm();
      onUpdate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/users/${user.id}/premium-accounts/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      setShowDeleteDialog(false);
      setSelectedAccount(null);
      onUpdate();
    },
  });

  const resetForm = () => {
    setFormData({
      accountType: 'BUYMEACOFFEE',
      accountEmail: '',
      isVerified: false,
    });
  };

  const handleEdit = (account: PremiumAccount) => {
    setSelectedAccount(account);
    setFormData({
      accountType: account.accountType,
      accountEmail: account.accountEmail,
      isVerified: account.isVerified,
    });
    setShowEditDialog(true);
  };

  const handleDelete = (account: PremiumAccount) => {
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <span className="font-medium">
            Linked Premium Accounts ({user.premiumAccounts.length})
          </span>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Account
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Premium accounts link external payment platforms (Buy Me A Coffee, Patreon) to this user account 
        for premium subscription verification.
      </p>

      {/* Accounts List */}
      <ScrollArea className="h-[350px] border rounded-lg">
        {user.premiumAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <CreditCard className="h-8 w-8 mb-2" />
            <p>No linked premium accounts</p>
            <Button 
              variant="link" 
              size="sm" 
              className="mt-2"
              onClick={() => setShowAddDialog(true)}
            >
              Add one now
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {user.premiumAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={() => handleEdit(account)}
                onDelete={() => handleDelete(account)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Premium Account</DialogTitle>
          </DialogHeader>
          <AccountForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={() => addMutation.mutate(formData)}
            onCancel={() => { setShowAddDialog(false); resetForm(); }}
            isLoading={addMutation.isPending}
            submitLabel="Add Account"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Premium Account</DialogTitle>
          </DialogHeader>
          <AccountForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={() => selectedAccount && updateMutation.mutate({ 
              id: selectedAccount.id, 
              data: formData 
            })}
            onCancel={() => { setShowEditDialog(false); setSelectedAccount(null); resetForm(); }}
            isLoading={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Premium Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {selectedAccount?.accountType} account 
              ({selectedAccount?.accountEmail})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAccount && deleteMutation.mutate(selectedAccount.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AccountCard({ 
  account, 
  onEdit, 
  onDelete 
}: { 
  account: PremiumAccount; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeInfo = ACCOUNT_TYPE_INFO[account.accountType];
  const Icon = typeInfo.icon;

  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${typeInfo.color}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{typeInfo.label}</span>
            {account.isVerified ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" /> Unverified
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{account.accountEmail}</p>
          <p className="text-xs text-muted-foreground">
            Added: {formatDate(account.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AccountForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel,
}: {
  formData: { accountType: 'BUYMEACOFFEE' | 'PATREON'; accountEmail: string; isVerified: boolean };
  setFormData: (data: typeof formData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accountType">Account Type</Label>
        <Select
          value={formData.accountType}
          onValueChange={(v: 'BUYMEACOFFEE' | 'PATREON') => 
            setFormData({ ...formData, accountType: v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUYMEACOFFEE">Buy Me A Coffee</SelectItem>
            <SelectItem value="PATREON">Patreon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountEmail">Account Email</Label>
        <Input
          id="accountEmail"
          type="email"
          value={formData.accountEmail}
          onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
          placeholder="supporter@example.com"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isVerified"
          type="checkbox"
          checked={formData.isVerified}
          onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
          className="rounded border-gray-300"
        />
        <Label htmlFor="isVerified">Mark as Verified</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !formData.accountEmail}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
