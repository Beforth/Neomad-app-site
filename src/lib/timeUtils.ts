/**
 * Utility functions for handling UTC storage and IST (Asia/Kolkata) display.
 * ALL dates & times in the UI are formatted in IST (India Standard Time).
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a UTC ISO timestamp or Date object to IST string with custom options.
 */
export function formatToIST(
  dateInput: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      timeZone: IST_TIMEZONE,
      ...options,
    });
  } catch (err) {
    return '—';
  }
}

/**
 * Format a UTC ISO timestamp to IST date string (e.g., "20 Aug 2026").
 */
export function formatDateIST(dateInput: string | Date | number | null | undefined): string {
  return formatToIST(dateInput, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a UTC ISO timestamp or "HH:MM" string to 12-hour IST time (e.g., "10:30 AM").
 */
export function formatTimeIST(timeOrIso: string | Date | number | null | undefined): string {
  if (!timeOrIso) return '—';
  
  // Handle HH:MM string directly
  if (typeof timeOrIso === 'string' && /^\d{2}:\d{2}$/.test(timeOrIso)) {
    const [h, m] = timeOrIso.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date.toLocaleTimeString('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  return formatToIST(timeOrIso, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a UTC ISO timestamp to full IST date & time (e.g., "20 Aug 2026, 10:30 AM").
 */
export function formatDateTimeIST(dateInput: string | Date | number | null | undefined): string {
  return formatToIST(dateInput, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
