'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentFiscalYear } from '@/lib/utils';

export interface AnalyticsData {
  fiscalYear: string;
  summary: {
    totalProposed: number;
    totalAllotted: number;
    totalSpent:  number;
    pendingAmount: number;
    remaining: number;
    utilization: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount:  number;
    receiptsCount: number;
  };
  monthlyTrend: Array<{ month: string; total: number }>;
  categoryBreakdown: Array<{ category: string; total:  number; allotted: number }>;
  recentExpenses: Array<{
    id: number;
    amount: number;
    vendor: string;
    expense_date: string;
    status: string;
    description: string;
    category_name: string;
  }>;
}

export function useAnalytics(fiscalYear?: string) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fy = fiscalYear || getCurrentFiscalYear();
      const response = await fetch(`/api/analytics?fiscal_year=${fy}`, {
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Network error.  Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    if (! hasFetched. current) {
      hasFetched.current = true;
      fetchAnalytics();
    }
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchAnalytics,
  };
}