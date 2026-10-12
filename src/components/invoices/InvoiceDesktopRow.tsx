import { memo, useCallback } from 'react';
import {
  Download,
  ClipboardCheck,
  UserPlus,
  XCircle,
  RotateCcw,
  Trash2,
  Banknote,
  CheckCircle2,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Paperclip,
} from 'lucide-react';
import type { ApiInvoice } from '../../lib/api';
import { formatDateTimeIST } from '../../lib/timeUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  assigned: 'bg-info/15 text-info',
  delivered: 'bg-primary/15 text-accent-foreground',
  return: 'bg-purple-100 text-purple-700',
  completed: 'bg-primary/15 text-accent-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
};

const TYPE_LABELS: Record<string, string> = {
  challan: 'Challan',
  price_difference: 'Price Diff',
  sale_bill: 'Sale Bill',
  sale_return_credit_note: 'Sale Return',
};

const TYPE_COLORS: Record<string, string> = {
  challan: 'bg-warning/10 text-warning',
  price_difference: 'bg-info/10 text-info',
  sale_bill: 'bg-accent text-primary',
  sale_return_credit_note: 'bg-purple-50 text-purple-600',
};

const typeLabel = (t: string | null | undefined) => TYPE_LABELS[t ?? ''] || t || 'Sale Bill';
const typeColor = (t: string | null | undefined) => TYPE_COLORS[t ?? ''] || (t ? 'bg-muted text-muted-foreground' : 'bg-accent text-primary');

export interface InvoiceDesktopRowProps {
  invoice: ApiInvoice;
  assigneeLabel: string;
  travel: string;
  waiting: string;
  userRole: string | undefined;
  onOpenDetail: (inv: ApiInvoice) => void;
  /** Open signed document preview in popup */
  onOpenSignedPreview: (imageUrl: string, invoiceNumber: string) => void;
  onDownloadInvoice: (inv: ApiInvoice) => void;
  onConfirmPayment: (inv: ApiInvoice) => void;
  onAssign: (id: number) => void;
  onRequestCancel: (inv: ApiInvoice) => void;
  onRequestRestore: (inv: ApiInvoice) => void;
  onRequestDelete: (inv: ApiInvoice) => void;
  onRequestRecoverDeleted?: (inv: ApiInvoice) => void;
  onMarkComplete?: (inv: ApiInvoice) => void;
  onReupload?: (inv: ApiInvoice) => void;
}

function InvoiceDesktopRowInner({
  invoice,
  assigneeLabel,
  travel,
  userRole,
  onOpenDetail,
  onOpenSignedPreview,
  onDownloadInvoice,
  onConfirmPayment,
  onAssign,
  onRequestCancel,
  onRequestRestore,
  onRequestDelete,
  onRequestRecoverDeleted,
  onMarkComplete,
  onReupload,
}: InvoiceDesktopRowProps) {
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const manager = userRole === 'admin' || userRole === 'manager';
  const canConfirmPayment =
    invoice.status === 'delivered' && manager && ((invoice.cash_received ?? 0) > 0 || (invoice.cheque_received ?? 0) > 0);
  const canAssign = invoice.status !== 'delivered' && invoice.status !== 'cancelled';
  const canComplete = manager && !['completed', 'cancelled'].includes(invoice.status);
  const canVoid = invoice.status === 'pending' || invoice.status === 'assigned';
  const canRestore = invoice.status === 'cancelled' && manager;
  const showDelete = !(invoice.deleted_at && onRequestRecoverDeleted) && manager;

  return (
    <TableRow className="cursor-pointer" onClick={() => onOpenDetail(invoice)}>
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{invoice.invoice_number}</span>
          {invoice.signed_copy_url && (
            <Paperclip className="size-3.5 text-muted-foreground" aria-label="Has signed copy" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">{typeLabel(invoice.invoice_type)}</span>
      </TableCell>
      <TableCell className="max-w-[280px]">
        <span className="line-clamp-2">{invoice.hospital_name}</span>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">₹{invoice.amount.toLocaleString()}</TableCell>
      <TableCell>
        <Badge className={`capitalize ${STATUS_COLORS[invoice.status] || ''}`} dot>
          {invoice.status}
        </Badge>
      </TableCell>
      <TableCell>
        <span className={assigneeLabel === '—' ? 'text-muted-foreground' : ''}>{assigneeLabel}</span>
        {travel !== '—' && <span className="block text-xs text-muted-foreground">Took {travel}</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTimeIST(invoice.created_at)}</TableCell>
      <TableCell className="w-10 pl-0" onClick={stop}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" data-row-menu="" aria-label={`Actions for ${invoice.invoice_number}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => onOpenDetail(invoice)}><Eye /> Open</DropdownMenuItem>
            {invoice.signed_copy_url && (
              <DropdownMenuItem onSelect={() => onOpenSignedPreview(invoice.signed_copy_url!, invoice.invoice_number)}>
                <ClipboardCheck /> View signed copy
              </DropdownMenuItem>
            )}
            {invoice.signed_copy_url && onReupload && (
              <DropdownMenuItem onSelect={() => onReupload(invoice)}><RefreshCw /> Replace signed copy</DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={!invoice.signed_copy_url} onSelect={() => onDownloadInvoice(invoice)}>
              <Download /> Download invoice
            </DropdownMenuItem>
            {(canConfirmPayment || canAssign || canComplete) && <DropdownMenuSeparator />}
            {canConfirmPayment && <DropdownMenuItem onSelect={() => onConfirmPayment(invoice)}><Banknote /> Confirm payment</DropdownMenuItem>}
            {canAssign && <DropdownMenuItem onSelect={() => onAssign(invoice.id)}><UserPlus /> Assign delivery</DropdownMenuItem>}
            {canComplete && <DropdownMenuItem onSelect={() => onMarkComplete?.(invoice)}><CheckCircle2 /> Mark complete</DropdownMenuItem>}
            {(canVoid || canRestore || (invoice.deleted_at && onRequestRecoverDeleted) || showDelete) && <DropdownMenuSeparator />}
            {canRestore && <DropdownMenuItem onSelect={() => onRequestRestore(invoice)}><RotateCcw /> Restore to pending</DropdownMenuItem>}
            {invoice.deleted_at && onRequestRecoverDeleted && (
              <DropdownMenuItem onSelect={() => onRequestRecoverDeleted(invoice)}><RotateCcw /> Recover deleted invoice</DropdownMenuItem>
            )}
            {canVoid && <DropdownMenuItem destructive onSelect={() => onRequestCancel(invoice)}><XCircle /> Void invoice</DropdownMenuItem>}
            {showDelete && <DropdownMenuItem destructive onSelect={() => onRequestDelete(invoice)}><Trash2 /> Delete invoice</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function propsEqual(prev: InvoiceDesktopRowProps, next: InvoiceDesktopRowProps) {
  return (
    prev.invoice === next.invoice &&
    prev.assigneeLabel === next.assigneeLabel &&
    prev.travel === next.travel &&
    prev.waiting === next.waiting &&
    prev.userRole === next.userRole &&
    prev.onOpenDetail === next.onOpenDetail &&
    prev.onOpenSignedPreview === next.onOpenSignedPreview &&
    prev.onDownloadInvoice === next.onDownloadInvoice &&
    prev.onConfirmPayment === next.onConfirmPayment &&
    prev.onAssign === next.onAssign &&
    prev.onRequestCancel === next.onRequestCancel &&
    prev.onRequestRestore === next.onRequestRestore &&
    prev.onRequestDelete === next.onRequestDelete
    && prev.onRequestRecoverDeleted === next.onRequestRecoverDeleted
    && prev.onMarkComplete === next.onMarkComplete
    && prev.onReupload === next.onReupload
  );
}

export const InvoiceDesktopRow = memo(InvoiceDesktopRowInner, propsEqual);
