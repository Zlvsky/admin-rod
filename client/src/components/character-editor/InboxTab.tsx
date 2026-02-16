import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
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
import { CharacterFull, InboxMessage } from './types';
import { api } from '@/api/client';
import { formatDate } from '@/lib/utils';
import { 
  Mail, 
  Send, 
  Trash2, 
  Gift,
  MailOpen,
  Inbox
} from 'lucide-react';

interface InboxTabProps {
  character: CharacterFull;
  onUpdate: () => void;
}

const MESSAGE_TYPES = [
  { value: 'system', label: 'System' },
  { value: 'reward', label: 'Reward' },
  { value: 'admin', label: 'Admin' },
  { value: 'event', label: 'Event' },
];

export function InboxTab({ character, onUpdate }: InboxTabProps) {
  const queryClient = useQueryClient();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    title: '',
    message: '',
    type: 'admin',
    rewards: {
      gold: 0,
      coins: 0,
    },
  });

  // Parse inbox from character - it might be stored as JSON
  const inbox: InboxMessage[] = Array.isArray((character as any).inbox) 
    ? (character as any).inbox 
    : [];

  const sendMessageMutation = useMutation({
    mutationFn: async (data: typeof newMessage) => {
      const response = await api.post(`/characters/${character.id}/send-message`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      setNewMessage({
        title: '',
        message: '',
        type: 'admin',
        rewards: { gold: 0, coins: 0 },
      });
      onUpdate();
    },
  });

  const clearInboxMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/characters/${character.id}/inbox`, { 
        data: { confirm: 'CLEAR' } 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', character.id] });
      setClearDialogOpen(false);
      onUpdate();
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.title || !newMessage.message) return;
    sendMessageMutation.mutate(newMessage);
  };

  return (
    <div className="space-y-6">
      {/* Send Message Form */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Send className="h-5 w-5" />
          Send Message
        </h3>
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msgTitle">Title</Label>
              <Input
                id="msgTitle"
                value={newMessage.title}
                onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                placeholder="Message title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msgType">Type</Label>
              <Select 
                value={newMessage.type} 
                onValueChange={(v) => setNewMessage({ ...newMessage, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="msgContent">Message</Label>
            <Textarea
              id="msgContent"
              value={newMessage.message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage({ ...newMessage, message: e.target.value })}
              placeholder="Message content..."
              rows={3}
              required
            />
          </div>
          
          {/* Optional Rewards */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4" />
              Attach Rewards (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rewardGold">Gold</Label>
                <Input
                  id="rewardGold"
                  type="number"
                  min="0"
                  value={newMessage.rewards.gold || ''}
                  onChange={(e) => setNewMessage({
                    ...newMessage,
                    rewards: { ...newMessage.rewards, gold: parseInt(e.target.value) || 0 }
                  })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rewardCoins">Coins</Label>
                <Input
                  id="rewardCoins"
                  type="number"
                  min="0"
                  value={newMessage.rewards.coins || ''}
                  onChange={(e) => setNewMessage({
                    ...newMessage,
                    rewards: { ...newMessage.rewards, coins: parseInt(e.target.value) || 0 }
                  })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={sendMessageMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </div>

      {/* Inbox Messages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Inbox ({inbox.length} messages)
          </h3>
          {inbox.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setClearDialogOpen(true)}
              disabled={clearInboxMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px] border rounded-lg">
          {inbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Mail className="h-8 w-8 mb-2" />
              <p>Inbox is empty</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {inbox.map((message: InboxMessage, index: number) => (
                <MessageCard key={message.id || index} message={message} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Clear Inbox Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Inbox?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {inbox.length} messages from {character.name}'s inbox. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearInboxMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MessageCard({ message }: { message: InboxMessage }) {
  const typeColors: Record<string, string> = {
    system: 'bg-blue-500',
    reward: 'bg-green-500',
    admin: 'bg-purple-500',
    event: 'bg-orange-500',
  };

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {message.read ? (
            <MailOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Mail className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium">{message.title}</span>
          <Badge className={typeColors[message.type] || 'bg-gray-500'}>
            {message.type}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {message.createdAt ? formatDate(message.createdAt) : 'N/A'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
      {message.from && (
        <p className="text-xs text-muted-foreground mt-1">From: {message.from}</p>
      )}
    </div>
  );
}
