import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

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
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const boxRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const estimatedHeight = 272;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const flip = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setPopupStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      top: flip ? undefined : rect.bottom + gap,
      bottom: flip ? window.innerHeight - rect.top + gap : undefined,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current?.contains(e.target as Node)) return;
      if (popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          requestAnimationFrame(updatePosition);
        }}
        className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-left flex items-center justify-between disabled:opacity-60"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} className="text-zinc-400 shrink-0" />
      </button>
      {open && !disabled
        ? createPortal(
            <div ref={popupRef} style={popupStyle} className="bg-white border border-zinc-200 rounded-lg shadow-lg p-2">
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-md outline-none"
                />
              </div>
              <div className="max-h-52 overflow-auto">
                {filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-zinc-100 ${
                      o.value === value ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-zinc-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
                {filtered.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-zinc-400">No matches</p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
