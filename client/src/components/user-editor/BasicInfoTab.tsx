import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { UserFull, getAuthMethod } from './types';
import { api } from '@/api/client';
import { formatDate } from '@/lib/utils';
import { 
  User, 
  Mail, 
  Calendar, 
  Hash, 
  Shield,
  Apple,
  Chrome,
  AlertTriangle
} from 'lucide-react';

interface BasicInfoTabProps {
  user: UserFull;
  onUpdate: () => void;
}

export function BasicInfoTab({ user, onUpdate }: BasicInfoTabProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(user.email);

  const updateMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await api.patch(`/users/${user.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      onUpdate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email !== user.email) {
      updateMutation.mutate({ email });
    }
  };

  const authMethod = getAuthMethod(user);
  const authIcon = authMethod === 'apple' ? Apple : authMethod === 'google' ? Chrome : Mail;
  const AuthIcon = authIcon;

  return (
    <div className="space-y-6">
      {/* User Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">User Index</p>
            <p className="text-sm font-medium">#{user.index}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <AuthIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Auth Method</p>
            <p className="text-sm font-medium capitalize">{authMethod}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Account Type</p>
            <Badge variant={user.isTemporary ? 'secondary' : 'default'}>
              {user.isTemporary ? 'Temporary' : 'Permanent'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Warning for temporary accounts */}
      {user.isTemporary && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p className="text-sm text-yellow-500">
            This is a temporary account. It may not have a verified email.
          </p>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit User Details
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>User ID (Read-only)</Label>
            <Input
              value={user.id}
              disabled
              className="font-mono text-sm"
            />
          </div>

          {user.appleUserId && (
            <div className="space-y-2">
              <Label>Apple User ID (Read-only)</Label>
              <Input
                value={user.appleUserId}
                disabled
                className="font-mono text-sm"
              />
            </div>
          )}

          {user.googleUserId && (
            <div className="space-y-2">
              <Label>Google User ID (Read-only)</Label>
              <Input
                value={user.googleUserId}
                disabled
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button 
            type="submit" 
            disabled={updateMutation.isPending || email === user.email}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEmail(user.email)}
            disabled={email === user.email}
          >
            Reset
          </Button>
        </div>
      </form>

      {/* Account Statistics */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-3">Account Statistics</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{user.characters.length}</p>
            <p className="text-xs text-muted-foreground">Characters</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{user.transactions.length}</p>
            <p className="text-xs text-muted-foreground">Transactions</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{user.premiumAccounts.length}</p>
            <p className="text-xs text-muted-foreground">Linked Accounts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
