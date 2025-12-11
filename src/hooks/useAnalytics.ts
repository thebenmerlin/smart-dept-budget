'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { getCurrentFiscalYear } from '@/lib/utils';

export interface AnalyticsData {
  fiscalYear: string;
  summary: {
    totalProposed: number;
    totalAllotted: number;
    totalSpent: number;
    pendingAmount: number;
    remaining: number;
    utilization: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    receiptsCount: number;
  };
  monthlyTrend: Array<{ month: string; total: number }>;
  categoryBreakdown: Array<{ category: string; total: number; allotted: number }>;
  recentExpenses: Array<{
    id: number;
    amount: number;
    vendor: string;
    expense_date: string;
    status: string;
    description:  string;
    category_name: string;
  }>;
}

export function useAnalytics(fiscalYear?: string) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const api = useApi<AnalyticsData>();

  const fetchAnalytics = useCallback(async () => {
    const fy = fiscalYear || getCurrentFiscalYear();
    const result = await api.get(`/api/analytics?fiscal_year=${fy}`);
    if (result.success && result.data) {
      setData(result.data);
    }
  }, [fiscalYear, api]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading: api.isLoading,
    error: api.error,
    refresh: fetchAnalytics,
  };
}