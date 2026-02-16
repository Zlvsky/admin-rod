import { Client } from 'ssh2';
import net from 'net';
import fs from 'fs';
import path from 'path';

interface SSHTunnelConfig {
  sshHost: string;
  sshPort: number;
  sshUser: string;
  sshKeyPath?: string;
  sshPassword?: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

export interface TunnelConnection {
  server: net.Server;
  sshClient: Client;
  close: () => Promise<void>;
}

export async function createSSHTunnel(config: SSHTunnelConfig): Promise<TunnelConnection> {
  return new Promise((resolve, reject) => {
    const sshClient = new Client();
    
    // Resolve home directory in path
    let privateKey: Buffer | undefined;
    if (config.sshKeyPath) {
      const keyPath = config.sshKeyPath.replace(/^~/, process.env.HOME || '');
      const resolvedPath = path.resolve(keyPath);
      
      if (!fs.existsSync(resolvedPath)) {
        reject(new Error(`SSH key not found at: ${resolvedPath}`));
        return;
      }
      
      privateKey = fs.readFileSync(resolvedPath);
    }

    const server = net.createServer((clientSocket) => {
      sshClient.forwardOut(
        '127.0.0.1',
        config.localPort,
        config.remoteHost,
        config.remotePort,
        (err, stream) => {
          if (err) {
            console.error('[SSH Tunnel] Forward error:', err.message);
            clientSocket.end();
            return;
          }
          
          clientSocket.pipe(stream);
          stream.pipe(clientSocket);
          
          clientSocket.on('error', (err) => {
            console.error('[SSH Tunnel] Client socket error:', err.message);
            stream.end();
          });
          
          stream.on('error', (err) => {
            console.error('[SSH Tunnel] Stream error:', err.message);
            clientSocket.end();
          });
        }
      );
    });

    sshClient.on('ready', () => {
      console.log('[SSH Tunnel] SSH connection established');
      
      server.listen(config.localPort, '127.0.0.1', () => {
        console.log(`[SSH Tunnel] Tunnel open: localhost:${config.localPort} -> ${config.remoteHost}:${config.remotePort}`);
        
        resolve({
          server,
          sshClient,
          close: async () => {
            return new Promise((res) => {
              server.close(() => {
                sshClient.end();
                console.log('[SSH Tunnel] Tunnel closed');
                res();
              });
            });
          }
        });
      });
      
      server.on('error', (err) => {
        console.error('[SSH Tunnel] Server error:', err.message);
        sshClient.end();
        reject(err);
      });
    });

    sshClient.on('error', (err) => {
      console.error('[SSH Tunnel] SSH connection error:', err.message);
      reject(err);
    });

    sshClient.on('close', () => {
      console.log('[SSH Tunnel] SSH connection closed');
      server.close();
    });

    // Connect to SSH server
    const connectionConfig: any = {
      host: config.sshHost,
      port: config.sshPort,
      username: config.sshUser,
      readyTimeout: 30000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
    };

    if (privateKey) {
      connectionConfig.privateKey = privateKey;
    } else if (config.sshPassword) {
      connectionConfig.password = config.sshPassword;
    } else {
      reject(new Error('Either SSH key path or password must be provided'));
      return;
    }

    console.log(`[SSH Tunnel] Connecting to ${config.sshHost}:${config.sshPort}...`);
    sshClient.connect(connectionConfig);
  });
}

export function getSSHTunnelConfigFromEnv(): SSHTunnelConfig | null {
  const useTunnel = process.env.USE_SSH_TUNNEL === 'true';
  
  if (!useTunnel) {
    return null;
  }

  const sshHost = process.env.SSH_HOST;
  const sshUser = process.env.SSH_USER;
  
  if (!sshHost || !sshUser) {
    console.warn('[SSH Tunnel] SSH_HOST and SSH_USER are required when USE_SSH_TUNNEL is true');
    return null;
  }

  return {
    sshHost,
    sshPort: parseInt(process.env.SSH_PORT || '22', 10),
    sshUser,
    sshKeyPath: process.env.SSH_KEY_PATH,
    sshPassword: process.env.SSH_PASSWORD,
    localPort: parseInt(process.env.SSH_LOCAL_PORT || '5433', 10),
    remoteHost: process.env.SSH_REMOTE_HOST || '127.0.0.1',
    remotePort: parseInt(process.env.SSH_REMOTE_PORT || '5432', 10),
  };
}
