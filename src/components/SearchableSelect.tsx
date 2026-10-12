/**
 * Searchable dropdown built on befui's Combobox / Popover.
 * Same props as before: pick from a list, or (allowCustom) type free text with suggestions.
 */
import { useMemo, useState } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  allowCustom = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, value]);

  if (!allowCustom) {
    return (
      <div className={className}>
        <Combobox
          value={value}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          // Clicking the selected option used to keep it selected; do the same.
          onValueChange={(v) => { if (v !== undefined) onChange(v); }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Popover open={open && !disabled && suggestions.length > 0} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div>
            <Input
              type="text"
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(e) => { onChange(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn('w-[var(--radix-popover-trigger-width)] min-w-48 p-1')}
        >
          <div className="max-h-52 overflow-auto">
            {suggestions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  'flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-secondary',
                  o.value === value && 'bg-accent text-accent-foreground',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
