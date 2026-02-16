import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage
let authToken: string | null = localStorage.getItem('adminToken');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('adminToken', token);
  } else {
    localStorage.removeItem('adminToken');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

// Request interceptor to add auth header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    username: string;
    role: string;
  };
}

export interface DashboardStats {
  overview: {
    totalUsers: number;
    totalCharacters: number;
    totalGuilds: number;
    totalItems: number;
    totalTransactions: number;
    premiumUsers: number;
    activeUsersLast7Days: number;
    totalRevenue: number;
  };
  charts: {
    dailyAverageLevels: Array<{ date: string; averageLevel: number }>;
    levelDistribution: Record<string, number>;
  };
  topGuilds: Array<{
    id: number;
    name: string;
    tag: string;
    honor: number;
    memberCount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    userEmail: string;
    amount: number;
    currency: string;
    type: string;
    accountType: string;
    createdAt: string;
    isProcessed: boolean;
  }>;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  premiumExpiresAt: string | null;
  characters: Character[];
}

export interface Character {
  id: string;
  name: string;
  level: number;
  gold: number;
  coins: number;
  honor: number;
  stamina: number;
  className: string;
  createdAt: string;
  userId: string;
}

export interface Guild {
  id: string;
  name: string;
  tag: string;
  honor: number;
  gold: number;
  level: number;
  createdAt: string;
  members: GuildMember[];
}

export interface GuildMember {
  id: string;
  rank: string;
  character: {
    id: string;
    name: string;
    level: number;
  };
}

export interface Item {
  id: number;
  name: string;
  type: string;
  description?: string;
  quality: number;
  requiredLevel: number;
  upgrade: number;
  count: number;
  effect1?: number;
  effect2?: number;
  assetId?: number;
  gold?: number;
  consumable?: boolean;
  inventoryId: number | null;
  inventory?: {
    character: {
      id: string;
      name: string;
    };
  };
}

export interface Transaction {
  id: string;
  amount: number;
  accountType: string;
  transactionType: string;
  createdAt: string;
  userId: string;
  user?: {
    email: string;
  };
}

export interface ArenaLeague {
  id: number;
  name: string;
  minLevel: number;
  maxLevel: number;
  hourlyGold: number;
  potIncrement: number;
  currentPot: number;
  createdAt: string;
  playerCount?: number;
  battleCount?: number;
}

export interface ArenaRanking {
  id: number;
  characterId: string;
  leagueId: number;
  rank: number;
  honor: number;
  totalWins: number;
  totalLosses: number;
  winStreak: number;
  lastBattleAt: string | null;
  character: {
    id: string;
    name: string;
    level: number;
    avatarId?: string;
  };
  league?: {
    id: number;
    name: string;
    minLevel: number;
    maxLevel: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Auth API
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),
  
  logout: () => api.post('/auth/logout'),
  
  me: () => api.get('/auth/me'),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard'),
  
  checkConnection: () => api.get('/dashboard/connection'),
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<User>>('/users', { params }),
  
  get: (id: string) => api.get<User>(`/users/${id}`),
  
  update: (id: string, data: Partial<User>) =>
    api.patch<User>(`/users/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/users/${id}`, { data: { confirm: 'DELETE' } }),
  
  grantPremium: (id: string, days: number) =>
    api.post(`/users/${id}/grant-premium`, { days }),
};

// Characters API
export const charactersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; userId?: string }) =>
    api.get<PaginatedResponse<Character>>('/characters', { params }),
  
  get: (id: string) => api.get<Character>(`/characters/${id}`),
  
  update: (id: string, data: Partial<Character>) =>
    api.patch<Character>(`/characters/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/characters/${id}`, { data: { confirm: 'DELETE' } }),
  
  updateStats: (id: string, stats: Record<string, number>) =>
    api.patch(`/characters/${id}/stats`, { stats }),
  
  updateCurrency: (id: string, currency: { gold?: number; coins?: number; honor?: number }) =>
    api.patch(`/characters/${id}/currency`, currency),
  
  sendMessage: (id: string, message: { title: string; content: string; rewards?: any }) =>
    api.post(`/characters/${id}/messages`, message),
  
  resetProgress: (id: string, resetType: 'full' | 'stats' | 'equipment' | 'inventory') =>
    api.post(`/characters/${id}/reset`, { resetType, confirm: 'DELETE' }),
};

// Guilds API
export const guildsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Guild>>('/guilds', { params }),
  
  get: (id: string) => api.get<Guild>(`/guilds/${id}`),
  
  update: (id: string, data: Partial<Guild>) =>
    api.patch<Guild>(`/guilds/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/guilds/${id}`, { data: { confirm: 'DELETE' } }),
  
  kickMember: (id: string, memberId: string) =>
    api.post(`/guilds/${id}/kick`, { memberId }),
  
  changeRank: (id: string, memberId: string, newRank: string) =>
    api.post(`/guilds/${id}/change-rank`, { memberId, newRank }),
  
  addCurrency: (id: string, currency: { gold?: number; honor?: number }) =>
    api.post(`/guilds/${id}/currency`, currency),
};

// Items API
export const itemsApi = {
  list: (params?: { page?: number; limit?: number; type?: string; quality?: number }) =>
    api.get<PaginatedResponse<Item>>('/items', { params }),
  
  get: (id: number | string) => api.get<Item>(`/items/${id}`),
  
  update: (id: number | string, data: Partial<Item>) =>
    api.patch<Item>(`/items/${id}`, data),
  
  delete: (id: number | string) =>
    api.delete(`/items/${id}`, { data: { confirm: 'DELETE' } }),
  
  createForCharacter: (characterId: string, itemData: Partial<Item>) =>
    api.post('/items/create-for-character', { ...itemData, characterId }),
};

// Transactions API
export const transactionsApi = {
  list: (params?: { 
    page?: number; 
    limit?: number; 
    userId?: string; 
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get<PaginatedResponse<Transaction>>('/transactions', { params }),
  
  get: (id: string) => api.get<Transaction>(`/transactions/${id}`),
  
  getStats: () => api.get('/transactions/stats/summary'),
};

// Arena API
export const arenaApi = {
  getLeagues: () => api.get<ArenaLeague[]>('/arena/leagues'),
  
  getRankings: (params?: { page?: number; limit?: number; leagueId?: string }) =>
    api.get<PaginatedResponse<ArenaRanking>>('/arena/rankings', { params }),
  
  adjustRank: (characterId: string, data: { newRank: number }) =>
    api.post(`/arena/rankings/${characterId}/adjust`, data),
  
  getBattles: (params?: { page?: number; limit?: number; characterId?: string }) =>
    api.get('/arena/battles', { params }),
};

// System API
export const systemApi = {
  broadcast: (message: { title: string; content: string; targetType: 'all' | 'premium' | 'character'; targetId?: string }) =>
    api.post('/system/broadcast', message),
  
  getAuditLogs: (params?: { page?: number; limit?: number; action?: string; date?: string }) =>
    api.get('/audit-logs', { params }),
};
