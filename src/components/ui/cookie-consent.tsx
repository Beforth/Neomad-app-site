import * as React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

/** Bottom-left consent card. Remembers the choice in localStorage under `storageKey`, so it only shows once. */
export function CookieConsent({
  onChoice,
  storageKey = 'befui-consent',
  title = 'We use cookies',
  children = 'Essential cookies keep the site working. Analytics cookies help us improve it, and stay off unless you accept.',
  className,
}: {
  onChoice?: (accepted: boolean) => void;
  storageKey?: string;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    try { setShow(!localStorage.getItem(storageKey)); } catch { setShow(true); }
  }, [storageKey]);
  if (!show) return null;
  const choose = (accepted: boolean) => {
    try { localStorage.setItem(storageKey, accepted ? 'accepted' : 'declined'); } catch { /* private mode: just hide */ }
    setShow(false);
    onChoice?.(accepted);
  };
  return (
    <div role="dialog" aria-label={title} className={cn('fixed bottom-4 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg animate-pop', className)}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{children}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => choose(true)}>Accept</Button>
        <Button size="sm" variant="outline" onClick={() => choose(false)}>Decline</Button>
      </div>
    </div>
  );
}
