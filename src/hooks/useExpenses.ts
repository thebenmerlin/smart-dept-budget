'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Expense {
  id: number;
  category_id: number;
  category_name: string;
  event_id: number | null;
  event_name: string | null;
  amount: number;
  vendor: string;
  expense_date:  string;
  description: string | null;
  invoice_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  created_by_name: string;
  approved_by: number | null;
  approved_by_name:  string | null;
  rejection_reason: string | null;
  receipts:  Array<{ id: number; filename: string; url: string }> | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const hasFetched = useRef(false);

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
  }, [pagination. limit, pagination.offset]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/expenses?${queryString}`, {
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setExpenses(result.data. expenses);
        setPagination(result.data.pagination);
      } else {
        setError(result.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError('Network error.  Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, buildQueryString]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchExpenses();
    }
  }, [fetchExpenses]);

  // Re-fetch when filters change (but not on initial mount)
  useEffect(() => {
    if (hasFetched.current) {
      fetchExpenses();
    }
  }, [filters]);

  const createExpense = async (expenseData: {
    category_id: number;
    event_id?:  number | null;
    amount: number;
    vendor: string;
    expense_date:  string;
    description?:  string;
    invoice_number?: string;
  }) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials:  'include',
        body: JSON. stringify(expenseData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchExpenses();
      }
      
      return result;
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const updateExpense = async (id: number, updates:  Partial<Expense>) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchExpenses();
      }
      
      return result;
    } catch (err) {
      return { success:  false, error: 'Network error' };
    }
  };

  const approveExpense = async (id: number) => {
    return updateExpense(id, { status: 'approved' } as any);
  };

  const rejectExpense = async (id: number, reason: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers:  { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchExpenses();
      }
      
      return result;
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchExpenses();
      }
      
      return result;
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const uploadReceipt = async (expenseId: number, file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('expense_id', String(expenseId));
      
      const response = await fetch('/api/receipts', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const result = await response. json();
      
      if (result. success) {
        await fetchExpenses();
      }
      
      return result;
    } catch (err) {
      return { success: false, error: 'Upload failed' };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    expenses,
    isLoading,
    error,
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
    isUploading,
  };
}