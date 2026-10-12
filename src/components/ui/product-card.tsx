import * as React from 'react';
import { Button } from './button';
import { HeartIcon, ImageIcon, PlusIcon } from './icons';
import { Rating } from './rating';
import { cn } from '@/lib/utils';

/** Formatted price. Pass `compareAt` to show the old price struck through. */
export function Price({ amount, compareAt, currency = 'INR', locale = 'en-IN', className }: { amount: number; compareAt?: number; currency?: string; locale?: string; className?: string }) {
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 tabular-nums', className)}>
      <span className="font-semibold">{fmt(amount)}</span>
      {compareAt && compareAt > amount && <s className="text-xs text-muted-foreground">{fmt(compareAt)}</s>}
    </span>
  );
}

/** Product tile: image, name, rating, price, wishlist heart and an Add button. Shows a discount tag when `compareAt` is set. */
export function ProductCard({
  image,
  name,
  category,
  price,
  compareAt,
  rating,
  reviews,
  wishlisted = false,
  onWishlist,
  onAdd,
  className,
}: {
  image?: string;
  name: string;
  category?: string;
  price: number;
  compareAt?: number;
  rating?: number;
  reviews?: number;
  wishlisted?: boolean;
  onWishlist?: (next: boolean) => void;
  onAdd?: () => void;
  className?: string;
}) {
  const off = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
  return (
    <div className={cn('group w-60 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm', className)}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? <img src={image} alt={name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <ImageIcon className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />}
        {off > 0 && <span className="absolute left-2.5 top-2.5 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-white">-{off}%</span>}
        {onWishlist && (
          <button
            type="button"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={wishlisted}
            onClick={() => onWishlist(!wishlisted)}
            className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-background/90 shadow-sm outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90"
          >
            <HeartIcon className={cn('size-4 transition-colors', wishlisted ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
          </button>
        )}
      </div>
      <div className="grid gap-2 p-3.5">
        <div className="grid gap-0.5">
          {category && <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{category}</span>}
          <h3 className="truncate text-sm font-medium">{name}</h3>
        </div>
        {rating !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Rating value={Math.round(rating)} max={5} className="[&_svg]:size-3.5" />
            {rating.toFixed(1)}{reviews !== undefined && ` (${reviews})`}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <Price amount={price} compareAt={compareAt} />
          {onAdd && <Button size="xs" onClick={onAdd}><PlusIcon /> Add</Button>}
        </div>
      </div>
    </div>
  );
}
