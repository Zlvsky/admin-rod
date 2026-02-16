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
import { UserFull } from './types';
import { BasicInfoTab } from './BasicInfoTab';
import { PremiumTab } from './PremiumTab';
import { PremiumAccountsTab } from './PremiumAccountsTab';
import { CharactersTab } from './CharactersTab';
import { TransactionsTab } from './TransactionsTab';
import { api } from '@/api/client';
import { 
  User, 
  Crown, 
  CreditCard, 
  Users, 
  Receipt,
  Loader2 
} from 'lucide-react';

interface UserEditDialogProps {
  userId: string | null;
  userEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserEditDialog({
  userId,
  userEmail,
  open,
  onOpenChange,
}: UserEditDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');

  const { data: user, isLoading, error, refetch } = useQuery<UserFull>({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },
    enabled: !!userId && open,
  });

  const handleUpdate = () => {
    refetch();
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'premium', label: 'Premium', icon: Crown },
    { id: 'accounts', label: 'Accounts', icon: CreditCard },
    { id: 'characters', label: 'Characters', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
  ];

  const isPremiumActive = user?.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit User: {user?.email || userEmail || 'Loading...'}
            {user && (
              <>
                {isPremiumActive && (
                  <Badge variant="default" className="gap-1">
                    <Crown className="h-3 w-3" /> Premium
                  </Badge>
                )}
                {user.isTemporary && (
                  <Badge variant="secondary">Temporary</Badge>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-destructive">
            Failed to load user data. Please try again.
          </div>
        ) : user ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
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
                  <BasicInfoTab user={user} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="premium" className="mt-0">
                  <PremiumTab user={user} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="accounts" className="mt-0">
                  <PremiumAccountsTab user={user} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="characters" className="mt-0">
                  <CharactersTab user={user} onUpdate={handleUpdate} />
                </TabsContent>

                <TabsContent value="transactions" className="mt-0">
                  <TransactionsTab user={user} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
