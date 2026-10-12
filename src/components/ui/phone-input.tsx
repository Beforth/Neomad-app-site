import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Country { code: string; name: string; dial: string; flag: string; /** Digits in a national number, used to group and to validate. */ digits: number }

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', dial: '91', flag: '🇮🇳', digits: 10 },
  { code: 'US', name: 'United States', dial: '1', flag: '🇺🇸', digits: 10 },
  { code: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧', digits: 10 },
  { code: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪', digits: 9 },
  { code: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦', digits: 9 },
  { code: 'SG', name: 'Singapore', dial: '65', flag: '🇸🇬', digits: 8 },
  { code: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺', digits: 9 },
  { code: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦', digits: 10 },
  { code: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪', digits: 10 },
  { code: 'FR', name: 'France', dial: '33', flag: '🇫🇷', digits: 9 },
  { code: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵', digits: 10 },
  { code: 'BR', name: 'Brazil', dial: '55', flag: '🇧🇷', digits: 11 },
  { code: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦', digits: 9 },
  { code: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬', digits: 10 },
  { code: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬', digits: 10 },
];

export interface PhoneValue {
  country: string;
  /** Digits only, without the country code. */
  national: string;
  /** International format, like +919876543210. Empty until a number is typed. */
  e164: string;
  /** True once the national number has the length the country expects. */
  valid: boolean;
}

const group = (d: string) => d.replace(/(\d{3,5})(?=\d)/g, '$1 ').trim();

/** Phone field with a country picker. Gives you the E.164 number and whether it is complete. Pass `countries` to trim or extend the list. */
export function PhoneInput({
  value,
  onValueChange,
  defaultCountry = 'IN',
  countries = COUNTRIES,
  invalid,
  className,
  disabled,
  id,
}: {
  value?: PhoneValue;
  onValueChange?: (v: PhoneValue) => void;
  defaultCountry?: string;
  countries?: Country[];
  invalid?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [inner, setInner] = React.useState<PhoneValue>({ country: defaultCountry, national: '', e164: '', valid: false });
  const v = value ?? inner;
  const c = countries.find((x) => x.code === v.country) ?? countries[0]!;

  const emit = (country: Country, raw: string) => {
    const national = raw.replace(/\D/g, '').slice(0, country.digits);
    const next = { country: country.code, national, e164: national ? `+${country.dial}${national}` : '', valid: national.length === country.digits };
    setInner(next);
    onValueChange?.(next);
  };

  return (
    <div className={cn('flex h-9 items-stretch rounded-md border border-input bg-background text-sm transition-[border,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15 has-[:disabled]:opacity-50', invalid && 'border-destructive', className)} dir="ltr">
      <label className="relative flex items-center gap-1.5 border-e px-2.5 hover:bg-secondary/60">
        <span aria-hidden className="text-base leading-none">{c.flag}</span>
        <span className="tabular-nums text-muted-foreground">+{c.dial}</span>
        <select
          aria-label="Country"
          disabled={disabled}
          value={c.code}
          onChange={(e) => emit(countries.find((x) => x.code === e.target.value)!, v.national)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {countries.map((x) => <option key={x.code} value={x.code}>{x.flag} {x.name} (+{x.dial})</option>)}
        </select>
      </label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        value={group(v.national)}
        placeholder={group('9'.repeat(c.digits))}
        onChange={(e) => emit(c, e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3 tabular-nums outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
