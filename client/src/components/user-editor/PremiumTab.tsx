import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { UserFull } from './types';
import { api } from '@/api/client';
import { formatDate } from '@/lib/utils';
import { 
  Crown, 
  Calendar, 
  Plus,
  Clock,
  AlertCircle
} from 'lucide-react';

interface PremiumTabProps {
  user: UserFull;
  onUpdate: () => void;
}

export function PremiumTab({ user, onUpdate }: PremiumTabProps) {
  const queryClient = useQueryClient();
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [customExpiry, setCustomExpiry] = useState(
    user.premiumExpiresAt 
      ? new Date(user.premiumExpiresAt).toISOString().slice(0, 16)
      : ''
  );

  const isPremiumActive = user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();
  
  const daysRemaining = user.premiumExpiresAt 
    ? Math.max(0, Math.ceil((new Date(user.premiumExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const grantPremiumMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await api.post(`/users/${user.id}/grant-premium`, { days });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      onUpdate();
    },
  });

  const setExpiryMutation = useMutation({
    mutationFn: async (expiryDate: string | null) => {
      const response = await api.patch(`/users/${user.id}`, { 
        premiumExpiresAt: expiryDate 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      onUpdate();
    },
  });

  const handleGrantPremium = () => {
    if (daysToAdd > 0) {
      grantPremiumMutation.mutate(daysToAdd);
    }
  };

  const handleSetExpiry = () => {
    if (customExpiry) {
      setExpiryMutation.mutate(new Date(customExpiry).toISOString());
    }
  };

  const handleRemovePremium = () => {
    setExpiryMutation.mutate(null);
  };

  return (
    <div className="space-y-6">
      {/* Premium Status Card */}
      <div className={`p-6 border rounded-lg ${isPremiumActive 
        ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30' 
        : 'bg-muted'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Crown className={`h-8 w-8 ${isPremiumActive ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <div>
              <h3 className="text-xl font-bold">Premium Status</h3>
              <Badge variant={isPremiumActive ? 'default' : 'secondary'}>
                {isPremiumActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          {isPremiumActive && (
            <div className="text-right">
              <p className="text-3xl font-bold">{daysRemaining}</p>
              <p className="text-sm text-muted-foreground">days remaining</p>
            </div>
          )}
        </div>

        {user.premiumExpiresAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {isPremiumActive ? 'Expires' : 'Expired'}: {formatDate(user.premiumExpiresAt)}
            </span>
          </div>
        )}

        {!user.premiumExpiresAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>This user has never had premium</span>
          </div>
        )}
      </div>

      {/* Grant Premium */}
      <div className="p-4 border rounded-lg space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Grant Premium Days
        </h3>
        <p className="text-sm text-muted-foreground">
          Add days to the user's premium subscription. If premium is active, days will be added to existing expiry. 
          If expired or never had premium, days will be added starting from now.
        </p>
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="daysToAdd">Days to Add</Label>
            <Input
              id="daysToAdd"
              type="number"
              min="1"
              max="365"
              value={daysToAdd}
              onChange={(e) => setDaysToAdd(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDaysToAdd(7)}
            >
              7d
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDaysToAdd(30)}
            >
              30d
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDaysToAdd(90)}
            >
              90d
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDaysToAdd(365)}
            >
              1yr
            </Button>
          </div>
          <Button 
            onClick={handleGrantPremium}
            disabled={grantPremiumMutation.isPending || daysToAdd <= 0}
          >
            {grantPremiumMutation.isPending ? 'Granting...' : 'Grant Premium'}
          </Button>
        </div>
      </div>

      {/* Set Custom Expiry */}
      <div className="p-4 border rounded-lg space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Set Custom Expiry Date
        </h3>
        <p className="text-sm text-muted-foreground">
          Manually set the premium expiration date and time.
        </p>
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="customExpiry">Expiry Date & Time</Label>
            <Input
              id="customExpiry"
              type="datetime-local"
              value={customExpiry}
              onChange={(e) => setCustomExpiry(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSetExpiry}
            disabled={setExpiryMutation.isPending || !customExpiry}
            variant="secondary"
          >
            {setExpiryMutation.isPending ? 'Setting...' : 'Set Expiry'}
          </Button>
        </div>
      </div>

      {/* Remove Premium */}
      {user.premiumExpiresAt && (
        <div className="p-4 border border-destructive/30 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-destructive">Remove Premium</h3>
          <p className="text-sm text-muted-foreground">
            This will immediately remove the user's premium status. The expiry date will be cleared.
          </p>
          <Button 
            variant="destructive"
            onClick={handleRemovePremium}
            disabled={setExpiryMutation.isPending}
          >
            {setExpiryMutation.isPending ? 'Removing...' : 'Remove Premium'}
          </Button>
        </div>
      )}
    </div>
  );
}
