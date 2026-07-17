import { Trophy } from 'lucide-react';

export default function Incentives() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Incentives</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage performance incentives and rewards</p>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
          <Trophy size={28} className="text-purple-500" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Coming Soon</h2>
        <p className="text-sm text-zinc-400 max-w-xs">
          Incentive management will help you set, track, and distribute performance rewards for your team.
        </p>
      </div>
    </div>
  );
}
