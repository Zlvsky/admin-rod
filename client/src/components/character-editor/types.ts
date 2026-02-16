// Types for the Character Editor components

export interface CharacterFull {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
  level: number;
  experience: number;
  honor: number;
  stamina: number;
  gold: number;
  coins: number;
  mount: number;
  mountEnd: string | null;
  location: number;
  avatarId: number;
  health: number;
  staminaCooldown: string | null;
  availableAvatars: number[];
  isPremium: boolean;
  user: {
    id: string;
    email: string;
    premiumExpiresAt: string | null;
  };
  statistics: Statistics | null;
  equipment: Equipment | null;
  inventory: Inventory | null;
  mountInventory: MountInventory | null;
  guildMember: GuildMember | null;
  dungeon: Dungeon | null;
  corruptedDungeon: CorruptedDungeon | null;
  depths: Depths | null;
  missions: Missions | null;
  village: Village | null;
  homestead: Homestead | null;
  arenaRanking: ArenaRanking | null;
  stages: Stage[];
  _count: {
    quests: number;
    bestiary: number;
  };
}

export interface Statistics {
  id: number;
  characterId: string;
  strength: number;
  dexterity: number;
  constitution: number;
  defense: number;
  luck: number;
}

export interface ItemData {
  id: number;
  name: string;
  type: string;
  description: string;
  count: number;
  requiredLevel: number;
  effect1: number;
  effect2: number;
  upgrade: number;
  consumable: boolean;
  assetId: number;
  gold: number;
  quality: number;
  epic: boolean;
  levelRange: unknown;
  enchantment: unknown;
  jewel: unknown;
  isFromMerchant: boolean;
  inventoryId: number | null;
  merchantId: number | null;
  mountInventoryId: number | null;
}

export interface Equipment {
  id: number;
  characterId: string;
  headItem: ItemData | null;
  armorItem: ItemData | null;
  legsItem: ItemData | null;
  bootsItem: ItemData | null;
  weaponItem: ItemData | null;
  offhandItem: ItemData | null;
  necklaceItem: ItemData | null;
  ringItem: ItemData | null;
}

export interface Inventory {
  id: number;
  characterId: string;
  maxItems: number;
  items: ItemData[];
}

export interface MountInventory {
  id: number;
  characterId: string;
  maxItems: number;
  items: ItemData[];
}

export interface GuildMember {
  id: number;
  characterId: string;
  guildId: number;
  joined: string;
  rank: 'MEMBER' | 'OFFICER' | 'LEADER';
  goldDonated: number;
  coinsDonated: number;
  guild: {
    id: number;
    name: string;
    tag: string;
    honor: number;
  };
}

export interface Dungeon {
  id: number;
  characterId: string;
  cooldownTo: string | null;
  checkpoints: DungeonCheckpoint[];
}

export interface CorruptedDungeon {
  id: number;
  characterId: string;
  checkpoints: DungeonCheckpoint[];
}

export interface DungeonCheckpoint {
  id: number;
  dungeonId: number | null;
  corruptedDungeonId: number | null;
  progress: number;
  finished: boolean;
  name_id: string;
  claimedTreasures: number[];
}

export interface Depths {
  id: number;
  characterId: string;
  cooldownTo: string | null;
  progress: number;
  bestScore: number;
  lastStartDate: string | null;
  catchupAwarded: boolean;
}

export interface Missions {
  id: number;
  characterId: string;
  availableMissions: unknown[];
  currentMissions: unknown[];
  lastRefresh: string | null;
  completedMissions: string[];
}

export interface Village {
  id: number;
  characterId: string;
  metal: number;
  stone: number;
  wood: number;
  rune1: number;
  buildings: VillageBuilding[];
  enchants: VillageEnchant[];
}

export interface VillageBuilding {
  id: number;
  villageId: number;
  name: string;
  level: number;
  buildStarted: string | null;
  buildFinish: string | null;
  resources: number;
  lastClaimed: string;
}

export interface VillageEnchant {
  id: number;
  villageId: number;
  enchantData: unknown;
}

export interface Homestead {
  id: number;
  characterId: string;
  createdAt: string;
  updatedAt: string;
  lastWorkerRefresh: string | null;
  activities: HomesteadActivity[];
  buildings: HomesteadBuilding[];
  resources: HomesteadResource[];
  workers: HomesteadWorker[];
}

export interface HomesteadActivity {
  id: number;
  homesteadId: number;
  activityType: string;
  level: number;
  currentXP: number;
  totalXP: number;
}

export interface HomesteadBuilding {
  id: number;
  homesteadId: number;
  buildingType: string;
  level: number;
  storedResources: number;
  buildStarted: string | null;
  buildFinish: string | null;
}

export interface HomesteadResource {
  id: number;
  homesteadId: number;
  name: string;
  type: string;
  subType: string | null;
  count: number;
  quality: number;
}

export interface HomesteadWorker {
  id: number;
  homesteadId: number;
  name: number;
  skills: unknown;
  endsAt: string;
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
  lastRewardAt: string | null;
  league: {
    id: number;
    name: string;
    minLevel: number;
    maxLevel: number;
  };
}

export interface Stage {
  id: number;
  characterId: string;
  unlocked: boolean;
  finished: boolean;
  location: number;
  checkpoints: StageCheckpoint[];
}

export interface StageCheckpoint {
  id: number;
  stageId: number;
  finished: boolean;
  unlocked: boolean;
  progress: number;
}

export interface InboxMessage {
  id: string;
  title: string;
  message: string;
  type: string;
  from: string;
  read: boolean;
  createdAt: string;
}
