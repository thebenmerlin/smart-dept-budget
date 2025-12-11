'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { getCurrentFiscalYear } from '@/lib/utils';

export interface BudgetItem {
  category_id: number;
  category_name: string;
  category_description: string;
  proposed_amount: number;
  allotted_amount:  number;
  spent_amount: number;
  variance: number;
  remaining:  number;
  utilization: number;
  plan_status: string | null;
  plan_id: number | null;
  allotment_id: number | null;
}

export interface BudgetData {
  fiscalYear: string;
  budgets: BudgetItem[];
  totals: {
    proposed: number;
    allotted: number;
    spent:  number;
    variance: number;
    remaining: number;
    utilization: number;
  };
}

export function useBudgets(fiscalYear?:  string) {
  const [data, setData] = useState<BudgetData | null>(null);
  const api = useApi<BudgetData>();

  const fetchBudgets = useCallback(async () => {
    const fy = fiscalYear || getCurrentFiscalYear();
    const result = await api.get(`/api/budgets? fiscal_year=${fy}`);
    if (result.success && result.data) {
      setData(result.data);
    }
  }, [fiscalYear, api]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const createPlan = async (categoryId: number, amount: number, justification?:  string) => {
    const fy = fiscalYear || getCurrentFiscalYear();
    const result = await api.post('/api/budgets', {
      category_id: categoryId,
      fiscal_year: fy,
      proposed_amount: amount,
      justification,
    });
    if (result.success) {
      await fetchBudgets();
    }
    return result;
  };

  const createAllotment = async (categoryId: number, amount: number, notes?: string) => {
    const fy = fiscalYear || getCurrentFiscalYear();
    const result = await api.post('/api/budgets/allotments', {
      category_id: categoryId,
      fiscal_year:  fy,
      allotted_amount:  amount,
      notes,
    });
    if (result. success) {
      await fetchBudgets();
    }
    return result;
  };

  return {
    data,
    isLoading: api.isLoading,
    error: api.error,
    refresh: fetchBudgets,
    createPlan,
    createAllotment,
  };
}