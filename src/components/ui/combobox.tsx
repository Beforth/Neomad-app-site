import * as React from 'react';
import { CheckIcon, SortIcon } from './icons';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Small text under the label. Also searchable. */
  description?: string;
}

const trigger =
  'flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-left text-sm outline-none transition-[border,box-shadow] hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/15';

interface CommonProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function List({ options, isSelected, toggle, searchPlaceholder, emptyText }: Pick<CommonProps, 'options' | 'searchPlaceholder' | 'emptyText'> & { isSelected: (v: string) => boolean; toggle: (v: string) => void }) {
  return (
    <Command>
      <CommandInput placeholder={searchPlaceholder ?? 'Search...'} className="h-10" />
      <CommandList>
        <CommandEmpty>{emptyText ?? 'No results.'}</CommandEmpty>
        <CommandGroup>
          {options.map((o) => (
            <CommandItem key={o.value} value={o.value} keywords={[o.label, o.description ?? '']} onSelect={() => toggle(o.value)}>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate">{o.label}</span>
                {o.description && <span className="truncate text-xs text-muted-foreground">{o.description}</span>}
              </span>
              <CheckIcon className={cn('!text-primary', isSelected(o.value) ? 'opacity-100' : 'opacity-0')} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

const content = 'w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden p-0';

/** Searchable single select. Clicking the selected option clears it. */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder,
  emptyText,
  disabled,
  className,
  id,
}: CommonProps & { value?: string; onValueChange?: (value: string | undefined) => void }) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" role="combobox" aria-expanded={open} disabled={disabled} className={cn(trigger, className)}>
          <span className={cn('truncate', !current && 'text-muted-foreground/70')}>{current?.label ?? placeholder}</span>
          <SortIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={content}>
        <List
          options={options}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          isSelected={(v) => v === value}
          toggle={(v) => {
            onValueChange?.(v === value ? undefined : v);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Searchable multi select. The list stays open so you can pick several. */
export function MultiCombobox({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder,
  emptyText,
  disabled,
  className,
  id,
  maxBadges = 2,
}: CommonProps & { value: string[]; onValueChange: (value: string[]) => void; maxBadges?: number }) {
  const picked = options.filter((o) => value.includes(o.value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button id={id} type="button" role="combobox" disabled={disabled} className={cn(trigger, className)}>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {picked.length === 0 && <span className="text-muted-foreground/70">{placeholder}</span>}
            {picked.slice(0, maxBadges).map((o) => (
              <Badge key={o.value} className="max-w-32 truncate">{o.label}</Badge>
            ))}
            {picked.length > maxBadges && <Badge variant="outline">+{picked.length - maxBadges}</Badge>}
          </span>
          <SortIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={content}>
        <List
          options={options}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          isSelected={(v) => value.includes(v)}
          toggle={(v) => onValueChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])}
        />
      </PopoverContent>
    </Popover>
  );
}
