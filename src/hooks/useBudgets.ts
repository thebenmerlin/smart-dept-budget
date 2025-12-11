'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentFiscalYear } from '@/lib/utils';

export interface BudgetItem {
  category_id: number;
  category_name: string;
  category_description: string;
  proposed_amount: number;
  allotted_amount: number;
  spent_amount: number;
  variance:  number;
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
    allotted:  number;
    spent: number;
    variance: number;
    remaining: number;
    utilization: number;
  };
}

export function useBudgets(fiscalYear?: string) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fy = fiscalYear || getCurrentFiscalYear();
      const response = await fetch(`/api/budgets?fiscal_year=${fy}`, {
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch budgets');
      }
    } catch (err) {
      setError('Network error.  Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    if (! hasFetched. current) {
      hasFetched. current = true;
      fetchBudgets();
    }
  }, [fetchBudgets]);

  const createPlan = async (categoryId: number, amount: number, justification?:  string) => {
    try {
      const fy = fiscalYear || getCurrentFiscalYear();
      const response = await fetch('/api/budgets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category_id: categoryId,
          fiscal_year: fy,
          proposed_amount: amount,
          justification,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchBudgets();
      }
      
      return result;
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const createAllotment = async (categoryId: number, amount: number, notes?: string) => {
    try {
      const fy = fiscalYear || getCurrentFiscalYear();
      const response = await fetch('/api/budgets/allotments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials:  'include',
        body: JSON. stringify({
          category_id: categoryId,
          fiscal_year: fy,
          allotted_amount: amount,
          notes,
        }),
      });
      
      const result = await response. json();
      
      if (result. success) {
        await fetchBudgets();
      }
      
      return result;
    } catch (err) {
      return { success:  false, error: 'Network error' };
    }
  };

  return {
    data,
    isLoading,
    error,
    refresh: fetchBudgets,
    createPlan,
    createAllotment,
  };
}