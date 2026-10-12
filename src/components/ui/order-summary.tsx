import * as React from 'react';
import { cn } from '@/lib/utils';

export interface OrderLine {
  id: string;
  name: string;
  detail?: string;
  qty: number;
  price: number;
  image?: string;
}

/**
 * Cart or checkout summary: line items, then subtotal, discount, shipping, tax and total. Totals are computed from `lines`.
 * `discount` is an amount off; `shipping` of 0 shows Free; `taxRate` is 0.18 for 18%. Put a CouponInput in `children`, a button in `action`.
 */
export function OrderSummary({
  lines,
  discount = 0,
  shipping,
  taxRate = 0,
  currency = 'INR',
  locale = 'en-IN',
  title = 'Order summary',
  action,
  children,
  className,
}: {
  lines: OrderLine[];
  discount?: number;
  shipping?: number;
  taxRate?: number;
  currency?: string;
  locale?: string;
  title?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * taxRate;
  const total = taxable + tax + (shipping ?? 0);
  const row = (label: string, value: React.ReactNode, tone?: string) => (
    <div className={cn('flex justify-between text-[13px]', tone)}><dt className="text-muted-foreground">{label}</dt><dd className="tabular-nums">{value}</dd></div>
  );
  return (
    <section className={cn('grid w-full max-w-sm gap-4 rounded-xl border bg-card p-5 text-card-foreground', className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="grid gap-3">
        {lines.map((l) => (
          <li key={l.id} className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
              <span className="absolute -right-0 -top-0 grid min-w-4 place-items-center rounded-bl-md bg-foreground px-1 text-[10px] font-semibold text-background">{l.qty}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{l.name}</p>
              {l.detail && <p className="truncate text-xs text-muted-foreground">{l.detail}</p>}
            </div>
            <span className="text-[13px] tabular-nums">{fmt(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      {children}
      <dl className="grid gap-2 border-t pt-4">
        {row('Subtotal', fmt(subtotal))}
        {discount > 0 && row('Discount', `-${fmt(discount)}`, 'text-success [&_dt]:text-success')}
        {shipping !== undefined && row('Shipping', shipping === 0 ? 'Free' : fmt(shipping))}
        {taxRate > 0 && row(`Tax (${Math.round(taxRate * 100)}%)`, fmt(tax))}
        <div className="flex justify-between border-t pt-3 text-sm font-semibold"><dt>Total</dt><dd className="tabular-nums">{fmt(total)}</dd></div>
      </dl>
      {action}
    </section>
  );
}
