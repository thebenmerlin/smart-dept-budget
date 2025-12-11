'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi, useFileUpload } from './useApi';

export interface Expense {
  id: number;
  category_id: number;
  category_name: string;
  event_id: number | null;
  event_name: string | null;
  amount: number;
  vendor:  string;
  expense_date: string;
  description: string | null;
  invoice_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  created_by_name: string;
  approved_by: number | null;
  approved_by_name:  string | null;
  rejection_reason: string | null;
  receipts: Array<{ id: number; filename: string; url:  string }> | null;
  created_at: string;
}

export interface ExpenseFilters {
  category_id?: number;
  status?: string;
  vendor?: string;
  date_from?: string;
  date_to?: string;
}

export function useExpenses(initialFilters:  ExpenseFilters = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const api = useApi();
  const fileUpload = useFileUpload();

  const buildQueryString = useCallback((f: ExpenseFilters) => {
    const params = new URLSearchParams();
    if (f.category_id) params.append('category_id', String(f.category_id));
    if (f.status) params.append('status', f.status);
    if (f.vendor) params.append('vendor', f.vendor);
    if (f.date_from) params.append('date_from', f.date_from);
    if (f.date_to) params.append('date_to', f.date_to);
    params.append('limit', String(pagination.limit));
    params.append('offset', String(pagination.offset));
    return params. toString();
  }, [pagination]);

  const fetchExpenses = useCallback(async () => {
    const queryString = buildQueryString(filters);
    const result = await api.get(`/api/expenses?${queryString}`);
    if (result.success && result.data) {
      setExpenses(result.data. expenses);
      setPagination(result.data.pagination);
    }
  }, [filters, buildQueryString, api]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (expenseData: {
    category_id: number;
    event_id?:  number | null;
    amount: number;
    vendor: string;
    expense_date:  string;
    description?:  string;
    invoice_number?: string;
  }) => {
    const result = await api.post('/api/expenses', expenseData);
    if (result.success) {
      await fetchExpenses();
    }
    return result;
  };

  const updateExpense = async (id: number, updates: Partial<Expense>) => {
    const result = await api.put(`/api/expenses/${id}`, updates);
    if (result.success) {
      await fetchExpenses();
    }
    return result;
  };

  const approveExpense = async (id: number) => {
    return updateExpense(id, { status: 'approved' } as any);
  };

  const rejectExpense = async (id: number, reason:  string) => {
    const result = await api. put(`/api/expenses/${id}`, { 
      status: 'rejected', 
      rejection_reason:  reason 
    });
    if (result.success) {
      await fetchExpenses();
    }
    return result;
  };

  const deleteExpense = async (id: number) => {
    const result = await api. delete(`/api/expenses/${id}`);
    if (result.success) {
      await fetchExpenses();
    }
    return result;
  };

  const uploadReceipt = async (expenseId: number, file: File) => {
    const result = await fileUpload. upload('/api/receipts', file, {
      expense_id: String(expenseId),
    });
    if (result.success) {
      await fetchExpenses();
    }
    return result;
  };

  return {
    expenses,
    isLoading: api.isLoading,
    error: api.error,
    pagination,
    filters,
    setFilters,
    refresh: fetchExpenses,
    createExpense,
    updateExpense,
    approveExpense,
    rejectExpense,
    deleteExpense,
    uploadReceipt,
    isUploading: fileUpload.isUploading,
  };
}