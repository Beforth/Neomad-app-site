import { ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ApprovalTemplate() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Approval Template</h1>
        <p className="text-[13px] text-muted-foreground">Define and manage approval workflows for your organization</p>
      </div>

      <Card className="p-10 flex flex-col items-center justify-center text-center" >
        <div className="w-16 h-16 bg-info/10 rounded-xl flex items-center justify-center mb-4">
          <ClipboardCheck size={28} className="text-info" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Coming Soon</h2>
        <p className="text-sm text-muted-foreground/70 max-w-xs">
          Approval templates let you configure multi-step approval chains for leave requests, expenses, and other workflows.
        </p>
      </Card>
    </div>
  );
}
