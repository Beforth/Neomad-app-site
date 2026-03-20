import { useCallback, useEffect, useState } from 'react';
import { getInvoice, normalizeFetchError, type ApiInvoice } from '../../lib/api';
import { useAppSelector } from '../../store/hooks';

/**
 * Loads a single invoice for invoice sub-routes. Uses Redux cache when present, always refreshes via API.
 */
export function useInvoiceLoader(token: string | null | undefined, invoiceId: number | null) {
  const cached = useAppSelector((s) => (invoiceId != null ? s.invoices.items.find((i) => i.id === invoiceId) : undefined));
  const [invoice, setInvoice] = useState<ApiInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || invoiceId == null) {
      setLoading(false);
      setInvoice(null);
      setError(invoiceId == null ? 'Invalid invoice' : 'Not signed in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoice(token, invoiceId);
      setInvoice(data);
    } catch (e) {
      setError(normalizeFetchError(e, 'Failed to load invoice'));
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [token, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Prefer freshly fetched row; fall back to list cache while first request runs */
  const display = invoice ?? cached ?? null;

  return { invoice: display, loading, error, reload: load };
}
