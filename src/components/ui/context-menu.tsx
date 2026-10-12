import * as React from 'react';
import * as M from '@radix-ui/react-context-menu';
import { CheckIcon, ChevronRightIcon } from './icons';
import { cn } from '@/lib/utils';

/** Right-click (or long-press on touch) menu. Wrap any element in ContextMenuTrigger asChild. */
export const ContextMenu = M.Root;
export const ContextMenuTrigger = M.Trigger;
export const ContextMenuGroup = M.Group;
export const ContextMenuSub = M.Sub;

const panel = 'z-50 min-w-[10rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg animate-pop';
const row = 'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-secondary [&_svg]:size-4 [&_svg]:text-muted-foreground';

export const ContextMenuContent = React.forwardRef<React.ElementRef<typeof M.Content>, React.ComponentPropsWithoutRef<typeof M.Content>>(
  ({ className, ...props }, ref) => (
    <M.Portal>
      <M.Content ref={ref} className={cn(panel, className)} {...props} />
    </M.Portal>
  ),
);
ContextMenuContent.displayName = 'ContextMenuContent';

export const ContextMenuItem = React.forwardRef<React.ElementRef<typeof M.Item>, React.ComponentPropsWithoutRef<typeof M.Item> & { destructive?: boolean }>(
  ({ className, destructive, ...props }, ref) => (
    <M.Item ref={ref} className={cn(row, destructive && 'text-destructive data-[highlighted]:bg-destructive/10 [&_svg]:text-destructive', className)} {...props} />
  ),
);
ContextMenuItem.displayName = 'ContextMenuItem';

export const ContextMenuCheckboxItem = React.forwardRef<React.ElementRef<typeof M.CheckboxItem>, React.ComponentPropsWithoutRef<typeof M.CheckboxItem>>(
  ({ className, children, ...props }, ref) => (
    <M.CheckboxItem ref={ref} className={cn(row, 'pl-8', className)} {...props}>
      <span className="absolute left-2 grid size-4 place-items-center">
        <M.ItemIndicator><CheckIcon className="size-3.5 text-primary" strokeWidth={3} /></M.ItemIndicator>
      </span>
      {children}
    </M.CheckboxItem>
  ),
);
ContextMenuCheckboxItem.displayName = 'ContextMenuCheckboxItem';

export const ContextMenuSubTrigger = React.forwardRef<React.ElementRef<typeof M.SubTrigger>, React.ComponentPropsWithoutRef<typeof M.SubTrigger>>(
  ({ className, children, ...props }, ref) => (
    <M.SubTrigger ref={ref} className={cn(row, 'data-[state=open]:bg-secondary', className)} {...props}>
      {children}
      <ChevronRightIcon className="ml-auto" />
    </M.SubTrigger>
  ),
);
ContextMenuSubTrigger.displayName = 'ContextMenuSubTrigger';

export const ContextMenuSubContent = React.forwardRef<React.ElementRef<typeof M.SubContent>, React.ComponentPropsWithoutRef<typeof M.SubContent>>(
  ({ className, ...props }, ref) => (
    <M.Portal>
      <M.SubContent ref={ref} className={cn(panel, className)} {...props} />
    </M.Portal>
  ),
);
ContextMenuSubContent.displayName = 'ContextMenuSubContent';

export const ContextMenuLabel = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Label>) => (
  <M.Label className={cn('px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground', className)} {...props} />
);
export const ContextMenuSeparator = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Separator>) => (
  <M.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
);
export const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('ml-auto pl-4 font-mono text-[11px] text-muted-foreground', className)} {...props} />
);
