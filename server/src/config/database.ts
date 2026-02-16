import { PrismaClient } from '@prisma/client';
import { createSSHTunnel, getSSHTunnelConfigFromEnv, type TunnelConnection } from '../utils/sshTunnel.js';

let prisma: PrismaClient | null = null;
let tunnelConnection: TunnelConnection | null = null;

export async function initializeDatabase(): Promise<PrismaClient> {
  if (prisma) {
    return prisma;
  }

  const tunnelConfig = getSSHTunnelConfigFromEnv();
  
  if (tunnelConfig) {
    console.log('[Database] Setting up SSH tunnel for production database...');
    
    try {
      tunnelConnection = await createSSHTunnel(tunnelConfig);
      
      // Use production database URL (which points to tunneled port)
      const dbUrl = process.env.DATABASE_URL_PROD;
      if (!dbUrl) {
        throw new Error('DATABASE_URL_PROD is required when using SSH tunnel');
      }
      
      prisma = new PrismaClient({
        datasources: {
          db: { url: dbUrl }
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      
      console.log('[Database] Connected to PRODUCTION database via SSH tunnel');
    } catch (error) {
      console.error('[Database] Failed to establish SSH tunnel:', error);
      throw error;
    }
  } else {
    // Direct connection for local development
    const dbUrl = process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL_LOCAL or DATABASE_URL is required');
    }
    
    prisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    
    console.log('[Database] Connected to LOCAL database');
  }

  // Test connection
  try {
    await prisma.$connect();
    console.log('[Database] Connection test successful');
  } catch (error) {
    console.error('[Database] Connection test failed:', error);
    throw error;
  }

  return prisma;
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return prisma;
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('[Database] Prisma disconnected');
  }
  
  if (tunnelConnection) {
    await tunnelConnection.close();
    tunnelConnection = null;
  }
}

// Graceful shutdown handler
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
