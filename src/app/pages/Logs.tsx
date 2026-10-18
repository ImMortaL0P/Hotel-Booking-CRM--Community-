import { useState, useEffect, useCallback } from 'react';
import { useData } from '../data/DataContext';
import { format, parseISO } from 'date-fns';
import { History, Globe, Server, Database, Activity, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

export function Logs() {
  const { logs, isSecondaryLoading, isSyncing } = useData();

  // Live Infrastructure Health Status
  const [health, setHealth] = useState({
    frontend: 'Online',
    backend: 'Checking...',
    database: 'Checking...',
    pingMs: 0,
    lastChecked: null as Date | null
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    const start = Date.now();
    try {
      const r = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(8000) });
      const res = r.ok ? await r.json() : null;
      if (res && res.status === 'ok') {
        setHealth({
          frontend: 'Online',
          backend: 'Online',
          database: res.dbStatus || 'Connected',
          pingMs: Date.now() - start,
          lastChecked: new Date()
        });
        setIsChecking(false);
        return;
      }
    } catch {
      // fall through
    }
    setHealth({
      frontend: 'Online',
      backend: 'Offline',
      database: 'Offline',
      pingMs: 0,
      lastChecked: new Date()
    });
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => { if (!document.hidden) checkHealth(); }, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display flex items-center gap-3">
              <History className="text-[#D4AF37] w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
              System Activity Logs
            </h1>
            {(isSecondaryLoading || isSyncing) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                Streaming logs...
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Audit trail of operations in MongoDB Atlas and system runtime</p>
        </div>
        <button
          onClick={checkHealth}
          disabled={isChecking}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-medium rounded-full bg-secondary hover:bg-muted border border-border text-foreground transition-all cursor-pointer self-start sm:self-auto shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-primary' : ''}`} />
          <span>Ping Infrastructure</span>
        </button>
      </div>

      {/* Live Infrastructure Status Panel */}
      <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">Live Infrastructure Status</h2>
          </div>
          {health.lastChecked && (
            <span className="text-[10px] font-mono text-muted-foreground">
              Last pinged: {health.lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Frontend Client */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Client App</p>
                <p className="text-[10px] font-mono text-muted-foreground">React · Vite · SPA</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{health.frontend}</span>
            </div>
          </div>

          {/* Express API */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                health.backend === 'Online'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600'
              }`}>
                <Server className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Express API</p>
                <p className="text-[10px] font-mono text-muted-foreground">Node.js · TSX · REST</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className={`w-2 h-2 rounded-full ${
                health.backend === 'Online' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-amber-500 animate-pulse'
              }`}></span>
              <span className={`font-semibold text-xs ${health.backend === 'Online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                {health.backend}
              </span>
              {health.pingMs > 0 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">({health.pingMs}ms)</span>
              )}
            </div>
          </div>

          {/* MongoDB Atlas */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                health.database === 'Connected' || health.database === 'Online'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600'
              }`}>
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">MongoDB</p>
                <p className="text-[10px] font-mono text-muted-foreground">Atlas Cloud · Replica</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className={`w-2 h-2 rounded-full ${
                health.database === 'Connected' || health.database === 'Online'
                  ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                  : 'bg-amber-500 animate-pulse'
              }`}></span>
              <span className={`font-semibold text-xs ${
                health.database === 'Connected' || health.database === 'Online'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600'
              }`}>
                {health.database}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto relative min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[580px]">
            <thead className="bg-secondary sticky top-0 z-10 border-b border-border">
              <tr className="whitespace-nowrap">
                <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-foreground">Timestamp</th>
                <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-foreground">User</th>
                <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-foreground">Action</th>
                <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm whitespace-nowrap text-muted-foreground font-mono">
                    {format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="py-3 sm:py-4 px-4 sm:px-6">
                    <div className="flex flex-col whitespace-nowrap">
                      <span className="text-xs sm:text-sm font-medium text-foreground">{log.userName}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{log.userId}</span>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-4 sm:px-6 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm text-muted-foreground">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    {isSecondaryLoading ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-7 h-7 animate-spin text-primary opacity-60" />
                        <span className="text-sm font-medium text-foreground">Fetching activity logs...</span>
                        <span className="text-xs text-muted-foreground">Synchronizing immutable audit trail</span>
                      </div>
                    ) : (
                      "No activity logs found."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
