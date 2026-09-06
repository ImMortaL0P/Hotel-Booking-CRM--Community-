import { useData } from '../data/DataContext';
import { format, parseISO } from 'date-fns';
import { History } from 'lucide-react';

export function Logs() {
  const { logs } = useData();

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground font-display flex items-center gap-3">
          <History className="text-[#D4AF37] w-8 h-8" />
          System Activity Logs
        </h1>
        <p className="text-muted-foreground mt-2">Audit trail of operations in MongoDB Atlas</p>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto relative min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="py-4 px-6 text-sm font-semibold text-foreground">Timestamp</th>
                <th className="py-4 px-6 text-sm font-semibold text-foreground">User</th>
                <th className="py-4 px-6 text-sm font-semibold text-foreground">Action</th>
                <th className="py-4 px-6 text-sm font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 text-sm whitespace-nowrap text-muted-foreground">
                    {format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{log.userName}</span>
                      <span className="text-xs text-muted-foreground">{log.userId}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-muted-foreground">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    No activity logs found.
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
