import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { UserFull } from './types';
import { formatDate } from '@/lib/utils';
import { 
  Receipt,
  CreditCard,
  Clock,
  DollarSign,
  Coins,
  Calendar,
  CheckCircle,
  XCircle,
  Coffee,
  Heart
} from 'lucide-react';

interface TransactionsTabProps {
  user: UserFull;
}

const transactionTypeLabels: Record<string, { label: string; color: string }> = {
  SUBSCRIPTION: { label: 'Subscription', color: 'bg-blue-500' },
  ONETIME_SUPPORT: { label: 'One-time Support', color: 'bg-green-500' },
  EXTRA_PURCHASE: { label: 'Extra Purchase', color: 'bg-purple-500' },
  COINS: { label: 'Coins', color: 'bg-yellow-500' },
};

const accountTypeIcons: Record<string, typeof Coffee> = {
  BUYMEACOFFEE: Coffee,
  PATREON: Heart,
};

export function TransactionsTab({ user }: TransactionsTabProps) {
  if (user.transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Receipt className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Transactions</p>
        <p className="text-sm">This user hasn't made any transactions yet.</p>
      </div>
    );
  }

  // Calculate summary stats
  const totalAmount = user.transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalCoinsAwarded = user.transactions.reduce((sum, t) => sum + t.coinsAwarded, 0);
  const totalPremiumDays = user.transactions.reduce((sum, t) => sum + t.premiumDays, 0);
  const processedCount = user.transactions.filter(t => t.isProcessed).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-sm font-medium">{user.transactions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <DollarSign className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-sm font-medium">${totalAmount.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Coins className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-xs text-muted-foreground">Coins Awarded</p>
            <p className="text-sm font-medium">{totalCoinsAwarded.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Calendar className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Premium Days</p>
            <p className="text-sm font-medium">{totalPremiumDays}</p>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-medium">{processedCount}</span> of{' '}
            <span className="font-medium">{user.transactions.length}</span> transactions processed
          </p>
        </div>
        {processedCount === user.transactions.length ? (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            All Processed
          </Badge>
        ) : (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {user.transactions.length - processedCount} Pending
          </Badge>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Rewards</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {user.transactions.map((transaction) => {
              const typeInfo = transactionTypeLabels[transaction.transactionType] || { 
                label: transaction.transactionType, 
                color: 'bg-gray-500' 
              };
              const AccountIcon = accountTypeIcons[transaction.accountType] || CreditCard;
              
              return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(transaction.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`${typeInfo.color} text-white`}
                    >
                      {typeInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <AccountIcon className="h-4 w-4" />
                      <span className="text-sm capitalize">
                        {transaction.accountType.toLowerCase().replace('_', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {transaction.amount.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs uppercase">
                        {transaction.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {transaction.coinsAwarded > 0 && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Coins className="h-3 w-3" />
                          <span>{transaction.coinsAwarded}</span>
                        </div>
                      )}
                      {transaction.premiumDays > 0 && (
                        <div className="flex items-center gap-1 text-blue-500">
                          <Calendar className="h-3 w-3" />
                          <span>{transaction.premiumDays} days</span>
                        </div>
                      )}
                      {transaction.coinsAwarded === 0 && transaction.premiumDays === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.isProcessed ? (
                      <Badge variant="success" className="flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" />
                        Processed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <XCircle className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Transaction ID Footer */}
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Transaction IDs</h4>
        <div className="space-y-1 text-xs font-mono">
          {user.transactions.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="text-muted-foreground">{formatDate(t.createdAt)}:</span>
              <span className="truncate">{t.transactionId}</span>
            </div>
          ))}
          {user.transactions.length > 5 && (
            <p className="text-muted-foreground mt-2">
              ...and {user.transactions.length - 5} more transactions
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
