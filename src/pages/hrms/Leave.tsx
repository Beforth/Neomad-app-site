import { CalendarOff } from 'lucide-react';

export default function Leave() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Leave</h1>
        <p className="text-sm text-zinc-500 mt-1">Track and manage leave requests</p>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
          <CalendarOff size={28} className="text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Coming Soon</h2>
        <p className="text-sm text-zinc-400 max-w-xs">
          Leave management will let employees request time off and managers approve or reject leave applications.
        </p>
      </div>
    </div>
  );
}
