'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentFiscalYear } from '@/lib/utils';

export interface RecentActivity {
  id: number;
  type: 'budget' | 'expense';
  activity_type: string;
  name: string;
  amount: number;
  date: string;
  status: string;
  category_name?: string;
  budget_name?: string;
}

export interface UpcomingEvent {
  id: number;
  type: 'budget' | 'breakdown';
  event_type: string;
  name: string;
  amount: number;
  date: string;
  expense_name?: string;
}

export interface AnalyticsData {
  fiscalYear: string;
  summary: {
    totalBudget: number;
    totalSpent: number;
    pendingAmount: number;
    remaining: number;
    utilization: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    budgetCount: number;
  };
  monthlyTrend: Array<{ month: string; total: number }>;
  categoryBreakdown: Array<{ category: string; total: number }>;
  recentActivity: RecentActivity[];
  upcomingEvents: UpcomingEvent[];
  recentExpenses: Array<{
    id: number;
    name: string;
    amount: number;
    expense_date: string;
    status: string;
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
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    if (!hasFetched.current) {
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