import { Banknote } from 'lucide-react';

export default function Payroll() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Payroll</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage salary and payroll processing</p>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
          <Banknote size={28} className="text-green-500" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Coming Soon</h2>
        <p className="text-sm text-zinc-400 max-w-xs">
          Payroll management will handle salary calculations, deductions, and payment processing for your team.
        </p>
      </div>
    </div>
  );
}
