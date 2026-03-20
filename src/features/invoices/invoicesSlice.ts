import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getInvoices,
  deleteInvoice,
  cancelInvoice,
  assignInvoice,
  updateInvoice,
  normalizeFetchError,
  type ApiInvoice,
  type InvoiceListParams,
} from '../../lib/api';

export type InvoicesListStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface InvoicesState {
  items: ApiInvoice[];
  total: number;
  status: InvoicesListStatus;
  /** True when re-fetching with existing rows (no full-table loading flash). */
  isRefreshing: boolean;
  error: string | null;
}

const initialState: InvoicesState = {
  items: [],
  total: 0,
  status: 'idle',
  isRefreshing: false,
  error: null,
};

export interface FetchInvoicesArgs {
  token: string;
  params: InvoiceListParams;
}

export const fetchInvoicesList = createAsyncThunk<
  { items: ApiInvoice[]; total: number },
  FetchInvoicesArgs,
  { rejectValue: string }
>('invoices/fetchList', async ({ token, params }, { rejectWithValue }) => {
  try {
    const result = await getInvoices(token, params);
    return { items: result.items, total: result.total };
  } catch (e) {
    return rejectWithValue(normalizeFetchError(e, 'Failed to load invoices'));
  }
});

export const deleteInvoiceThunk = createAsyncThunk<number, { token: string; id: number }, { rejectValue: string }>(
  'invoices/delete',
  async ({ token, id }, { rejectWithValue }) => {
    try {
      await deleteInvoice(token, id);
      return id;
    } catch (e) {
      return rejectWithValue(normalizeFetchError(e, 'Failed to delete'));
    }
  }
);

export const cancelInvoiceThunk = createAsyncThunk<ApiInvoice, { token: string; id: number }, { rejectValue: string }>(
  'invoices/cancel',
  async ({ token, id }, { rejectWithValue }) => {
    try {
      return await cancelInvoice(token, id);
    } catch (e) {
      return rejectWithValue(normalizeFetchError(e, 'Failed to cancel'));
    }
  }
);

export const assignInvoiceThunk = createAsyncThunk<
  ApiInvoice,
  { token: string; id: number; assignedTo: number },
  { rejectValue: string }
>('invoices/assign', async ({ token, id, assignedTo }, { rejectWithValue }) => {
  try {
    return await assignInvoice(token, id, assignedTo);
  } catch (e) {
    return rejectWithValue(normalizeFetchError(e, 'Failed to assign'));
  }
});

export const confirmPaymentThunk = createAsyncThunk<
  ApiInvoice,
  { token: string; invoice: ApiInvoice },
  { rejectValue: string }
>('invoices/confirmPayment', async ({ token, invoice }, { rejectWithValue }) => {
  try {
    return await updateInvoice(token, invoice.id, {
      cash_confirmed: (invoice.cash_received ?? 0) > 0,
      cheque_confirmed: (invoice.cheque_received ?? 0) > 0,
    });
  } catch (e) {
    return rejectWithValue(normalizeFetchError(e, 'Failed to confirm payment'));
  }
});

function replaceById(state: InvoicesState, updated: ApiInvoice) {
  const idx = state.items.findIndex((i) => i.id === updated.id);
  if (idx >= 0) state.items[idx] = updated;
}

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearInvoicesError: (state) => {
      state.error = null;
    },
    /** If page becomes empty after delete, caller may refetch previous page. */
    resetInvoices: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoicesList.pending, (state) => {
        state.error = null;
        if (state.items.length === 0) {
          state.status = 'loading';
        } else {
          state.isRefreshing = true;
        }
      })
      .addCase(fetchInvoicesList.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isRefreshing = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(fetchInvoicesList.rejected, (state, action) => {
        state.isRefreshing = false;
        state.status = state.items.length > 0 ? 'succeeded' : 'failed';
        state.error = action.payload ?? 'Failed to load invoices';
        if (state.items.length === 0) {
          state.items = [];
          state.total = 0;
        }
      })
      .addCase(deleteInvoiceThunk.fulfilled, (state, action) => {
        const id = action.payload;
        state.items = state.items.filter((i) => i.id !== id);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteInvoiceThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Delete failed';
      })
      .addCase(cancelInvoiceThunk.fulfilled, (state, action) => {
        replaceById(state, action.payload);
      })
      .addCase(cancelInvoiceThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Cancel failed';
      })
      .addCase(assignInvoiceThunk.fulfilled, (state, action) => {
        replaceById(state, action.payload);
      })
      .addCase(assignInvoiceThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Assign failed';
      })
      .addCase(confirmPaymentThunk.fulfilled, (state, action) => {
        replaceById(state, action.payload);
      })
      .addCase(confirmPaymentThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Confirm payment failed';
      });
  },
});

export const { clearInvoicesError, resetInvoices } = invoicesSlice.actions;
export default invoicesSlice.reducer;
