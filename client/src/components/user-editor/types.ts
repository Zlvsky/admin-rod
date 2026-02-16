// Types for the User Editor components

export interface UserFull {
  id: string;
  email: string;
  index: number;
  createdAt: string;
  premiumExpiresAt: string | null;
  isTemporary: boolean;
  appleUserId: string | null;
  googleUserId: string | null;
  isPremium: boolean;
  characters: UserCharacter[];
  premiumAccounts: PremiumAccount[];
  transactions: Transaction[];
}

export interface UserCharacter {
  id: string;
  name: string;
  level: number;
  experience: number;
  gold: number;
  coins: number;
  honor: number;
  stamina: number;
  health: number;
  isPremium: boolean;
  createdAt: string;
  avatarId: number;
  statistics: CharacterStatistics | null;
  guildMember: {
    rank: string;
    guild: {
      id: number;
      name: string;
      tag: string;
    };
  } | null;
  _count: {
    quests: number;
    stages: number;
  };
}

export interface CharacterStatistics {
  id: number;
  characterId: string;
  strength: number;
  dexterity: number;
  constitution: number;
  defense: number;
  luck: number;
}

export interface PremiumAccount {
  id: number;
  userId: string;
  accountType: 'BUYMEACOFFEE' | 'PATREON';
  accountEmail: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  transactionId: string;
  accountType: 'BUYMEACOFFEE' | 'PATREON';
  transactionType: 'SUBSCRIPTION' | 'ONETIME_SUPPORT' | 'EXTRA_PURCHASE' | 'COINS';
  amount: number;
  currency: string;
  coinsAwarded: number;
  premiumDays: number;
  isProcessed: boolean;
  createdAt: string;
}

export type AuthMethod = 'email' | 'apple' | 'google';

export function getAuthMethod(user: UserFull): AuthMethod {
  if (user.appleUserId) return 'apple';
  if (user.googleUserId) return 'google';
  return 'email';
}
