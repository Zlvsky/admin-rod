import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatNumber, formatCurrency } from '@/lib/utils';
import {
  Users,
  Swords,
  Shield,
  Trophy,
  CreditCard,
  TrendingUp,
  Crown,
  Coins,
} from 'lucide-react';

export function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive bg-destructive/10 rounded-md">
        Failed to load dashboard statistics
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats?.overview?.totalUsers || 0),
      description: `${formatNumber(stats?.overview?.premiumUsers || 0)} premium`,
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: 'Premium Users',
      value: formatNumber(stats?.overview?.premiumUsers || 0),
      description: 'Active subscriptions',
      icon: <Crown className="h-5 w-5 text-yellow-500" />,
    },
    {
      title: 'Total Characters',
      value: formatNumber(stats?.overview?.totalCharacters || 0),
      description: `${formatNumber(stats?.overview?.activeUsersLast7Days || 0)} active (7d)`,
      icon: <Swords className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: 'Total Guilds',
      value: formatNumber(stats?.overview?.totalGuilds || 0),
      description: `${formatNumber(stats?.topGuilds?.length || 0)} top guilds`,
      icon: <Shield className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: 'Total Items',
      value: formatNumber(stats?.overview?.totalItems || 0),
      description: 'In all inventories',
      icon: <Trophy className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.overview?.totalRevenue || 0),
      description: 'All time',
      icon: <CreditCard className="h-5 w-5 text-green-500" />,
    },
    {
      title: 'Transactions',
      value: formatNumber(stats?.overview?.totalTransactions || 0),
      description: 'Total processed',
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
    },
    {
      title: 'Recent Activity',
      value: formatNumber(stats?.recentTransactions?.length || 0),
      description: 'Recent transactions',
      icon: <Coins className="h-5 w-5 text-yellow-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your game statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional stats section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Guilds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.topGuilds?.slice(0, 5).map((guild, index) => (
              <div key={guild.id} className="flex justify-between">
                <span className="text-muted-foreground">
                  {index + 1}. [{guild.tag}] {guild.name}
                </span>
                <span className="font-medium">{formatNumber(guild.honor)} honor</span>
              </div>
            ))}
            {(!stats?.topGuilds || stats.topGuilds.length === 0) && (
              <p className="text-muted-foreground">No guilds found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Level Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.charts?.levelDistribution && Object.entries(stats.charts.levelDistribution).map(([range, count]) => (
              <div key={range} className="flex justify-between">
                <span className="text-muted-foreground">Level {range}</span>
                <span className="font-medium">{formatNumber(count as number)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
