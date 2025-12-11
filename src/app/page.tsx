'use client';

import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth, useRole } from '@/context/AuthContext';
import StatCard from '@/components/cards/StatCard';
import Alerts from '@/components/Alerts';
import CategoryDonut from '@/components/charts/CategoryDonut';
import MonthlyTrend from '@/components/charts/MonthlyTrend';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { canApprove } = useRole();
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandNavy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, monthlyTrend, categoryBreakdown, recentExpenses } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brandPrimary uppercase tracking-wider">
            JSPM RSCOE - CSBS Department
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Budget Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {user?.name} - Fiscal Year {data.fiscalYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={summary.utilization >= 100 ? 'danger' : summary.utilization >= 85 ? 'warning' : 'success'}>
            {summary.utilization. toFixed(1)}% Utilized
          </Badge>
          <span className="text-xs text-slate-400">
            Last updated: {formatDate(new Date(), 'dd MMM, HH:mm')}
          </span>
        </div>
      </div>

      <Alerts utilization={summary.utilization} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Allotted"
          value={formatCurrency(summary. totalAllotted)}
          subtitle="Annual budget"
          accent
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(summary. totalSpent)}
          subtitle={`${summary.approvedCount} approved expenses`}
        />
        <StatCard
          title="Remaining Balance"
          value={formatCurrency(summary.remaining)}
          subtitle="Available to spend"
        />
        <StatCard
          title="Pending Approvals"
          value={summary.pendingCount. toString()}
          subtitle={canApprove ? 'Awaiting your review' : 'Awaiting approval'}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Budget Utilization</h3>
          <span className="text-sm text-slate-500">FY {data.fiscalYear}</span>
        </div>
        <ProgressBar
          value={summary. totalSpent}
          max={summary.totalAllotted}
          size="lg"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Proposed</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(summary.totalProposed)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Allotted</p>
            <p className="text-lg font-semibold text-brandNavy">
              {formatCurrency(summary.totalAllotted)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Spent</p>
            <p className="text-lg font-semibold text-brandPrimary">
              {formatCurrency(summary.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-lg font-semibold text-amber-600">
              {formatCurrency(summary.pendingAmount)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDonut
          data={categoryBreakdown. map(c => ({
            category: c.category,
            total: c.total
          }))}
        />
        <MonthlyTrend data={monthlyTrend} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Expenses</h3>
          <a href="/expenses" className="text-sm text-brandNavy hover:underline">
            View all
          </a>
        </div>
        {recentExpenses. length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No expenses recorded yet
          </div>
        ) : (
          <Table
            columns={[
              {
                key: 'expense_date',
                header: 'Date',
                render: (row) => formatDate(row.expense_date, 'dd MMM yyyy')
              },
              { key: 'category_name', header: 'Category' },
              {
                key: 'description',
                header:  'Description',
                className: 'max-w-xs truncate',
                render: (row) => row.description || '-'
              },
              { key: 'vendor', header: 'Vendor' },
              {
                key: 'amount',
                header: 'Amount',
                render: (row) => (
                  <span className="font-medium text-slate-900">
                    {formatCurrency(row.amount)}
                  </span>
                ),
              },
              {
                key: 'status',
                header:  'Status',
                render: (row) => (
                  <Badge
                    variant={
                      row.status === 'approved' ? 'success' : 
                      row. status === 'rejected' ? 'danger' :  'warning'
                    }
                  >
                    {row.status}
                  </Badge>
                ),
              },
            ]}
            data={recentExpenses}
          />
        )}
      </div>
    </div>
  );
}