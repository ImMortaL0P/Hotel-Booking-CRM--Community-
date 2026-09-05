import { useData } from '../data/DataContext';
import { format, parseISO } from 'date-fns';
import { History } from 'lucide-react';

export function Logs() {
  const { logs } = useData();

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2d1b1c] font-display flex items-center gap-3">
          <History className="text-[#D4AF37] w-8 h-8" />
          System Activity Logs
        </h1>
        <p className="text-gray-600 mt-2">Audit trail of operations in MongoDB Atlas</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e6dfd8] overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto relative min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fcfaf8] sticky top-0 z-10 border-b border-[#e6dfd8]">
              <tr>
                <th className="py-4 px-6 text-sm font-semibold text-[#2d1b1c]">Timestamp</th>
                <th className="py-4 px-6 text-sm font-semibold text-[#2d1b1c]">User</th>
                <th className="py-4 px-6 text-sm font-semibold text-[#2d1b1c]">Action</th>
                <th className="py-4 px-6 text-sm font-semibold text-[#2d1b1c]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6dfd8]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#faf7f5] transition-colors">
                  <td className="py-4 px-6 text-sm whitespace-nowrap text-gray-600">
                    {format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#2d1b1c]">{log.userName}</span>
                      <span className="text-xs text-gray-500">{log.userId}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f4ede4] text-[#7B1E22]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
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
