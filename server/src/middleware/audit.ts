import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from './auth.js';

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  admin: string;
  target?: {
    type: string;
    id: string;
    name?: string;
  };
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ip: string;
  userAgent?: string;
}

const LOG_DIR = process.env.AUDIT_LOG_PATH || './audit-logs';

// Ensure log directory exists
function ensureLogDir(): void {
  const resolvedPath = path.resolve(LOG_DIR);
  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }
}

// Get current log file path (daily rotation)
function getLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.resolve(LOG_DIR, `audit-${date}.json`);
}

// Append to log file
function appendToLog(entry: AuditLogEntry): void {
  if (process.env.AUDIT_LOG_ENABLED !== 'true') {
    return;
  }

  try {
    ensureLogDir();
    const logPath = getLogFilePath();
    
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logPath, line);
  } catch (error) {
    console.error('[Audit] Failed to write log:', error);
  }
}

// Log an action
export function logAuditAction(
  admin: string,
  action: string,
  options?: {
    target?: AuditLogEntry['target'];
    changes?: AuditLogEntry['changes'];
    metadata?: AuditLogEntry['metadata'];
    ip?: string;
    userAgent?: string;
  }
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    admin,
    target: options?.target,
    changes: options?.changes,
    metadata: options?.metadata,
    ip: options?.ip || 'unknown',
    userAgent: options?.userAgent,
  };

  appendToLog(entry);
  
  // Also log to console for immediate visibility
  console.log(`[Audit] ${admin} performed ${action}`, options?.target ? `on ${options.target.type}:${options.target.id}` : '');
}

// Middleware to automatically log API requests
export function auditMiddleware(actionPrefix: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function (body) {
      // Log successful mutating requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400) {
        const action = `${actionPrefix}_${req.method}`;
        logAuditAction(
          req.admin?.username || 'unknown',
          action,
          {
            metadata: {
              path: req.path,
              params: req.params,
              statusCode: res.statusCode,
            },
            ip: req.ip || req.socket?.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'],
          }
        );
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}

// Read audit logs for a date range
export function readAuditLogs(
  startDate?: string,
  endDate?: string
): AuditLogEntry[] {
  ensureLogDir();
  
  const logDir = path.resolve(LOG_DIR);
  const files = fs.readdirSync(logDir).filter(f => f.startsWith('audit-') && f.endsWith('.json'));
  
  const entries: AuditLogEntry[] = [];
  
  for (const file of files) {
    const dateMatch = file.match(/audit-(\d{4}-\d{2}-\d{2})\.json/);
    if (!dateMatch) continue;
    
    const fileDate = dateMatch[1];
    
    // Filter by date range if provided
    if (startDate && fileDate < startDate) continue;
    if (endDate && fileDate > endDate) continue;
    
    const filePath = path.join(logDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const lines = content.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch (e) {
        console.warn('[Audit] Failed to parse log line:', line);
      }
    }
  }
  
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
