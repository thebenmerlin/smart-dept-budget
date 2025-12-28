'use client';

import { useAnalytics, RecentActivity, UpcomingEvent } from '@/hooks/useAnalytics';
import { useAuth, useRole } from '@/context/AuthContext';
import StatCard from '@/components/cards/StatCard';
import Alerts from '@/components/Alerts';
import CategoryDonut from '@/components/charts/CategoryDonut';
import MonthlyTrend from '@/components/charts/MonthlyTrend';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';
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

  const { summary, monthlyTrend, categoryBreakdown, recentActivity, upcomingEvents, recentExpenses } = data;

  const getActivityIcon = (activity: RecentActivity) => {
    if (activity.type === 'budget') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    if (activity.activity_type === 'expense_approved') {
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (activity.activity_type === 'expense_rejected') {
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  };

  const getActivityLabel = (activity: RecentActivity) => {
    switch (activity.activity_type) {
      case 'budget_created':
        return 'Budget Created';
      case 'expense_approved':
        return 'Expense Approved';
      case 'expense_rejected':
        return 'Expense Rejected';
      case 'expense_created':
        return 'Expense Added';
      default:
        return activity.activity_type;
    }
  };

  const getEventIcon = (event: UpcomingEvent) => {
    if (event.type === 'budget') {
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            {summary.utilization.toFixed(1)}% Utilized
          </Badge>
          <span className="text-xs text-slate-400">
            Last updated: {formatDate(new Date(), 'dd MMM, HH:mm')}
          </span>
        </div>
      </div>

      {/* Alerts */}
      <Alerts utilization={summary.utilization} />

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Budget"
          value={formatCurrency(summary.totalBudget)}
          subtitle={`${summary.budgetCount} active budgets`}
          accent
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(summary.totalSpent)}
          subtitle={`${summary.approvedCount} approved`}
        />
        <StatCard
          title="Remaining Balance"
          value={formatCurrency(summary.remaining)}
          subtitle="Available to spend"
        />
        <StatCard
          title="Pending Approvals"
          value={summary.pendingCount.toString()}
          subtitle={canApprove ? 'Awaiting your review' : 'Awaiting approval'}
        />
      </div>

      {/* Budget Utilization Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Budget Utilization</h3>
          <span className="text-sm text-slate-500">FY {data.fiscalYear}</span>
        </div>
        <ProgressBar
          value={summary.totalSpent}
          max={summary.totalBudget || 1}
          size="lg"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Total Budget</p>
            <p className="text-lg font-semibold text-brandNavy">
              {formatCurrency(summary.totalBudget)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Spent</p>
            <p className="text-lg font-semibold text-brandPrimary">
              {formatCurrency(summary.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Remaining</p>
            <p className={`text-lg font-semibold ${summary.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.remaining)}
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

      {/* Recent Activity & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-500 mt-1">Latest budgets and expenses</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.slice(0, 6).map((activity, idx) => (
                <div key={`${activity.type}-${activity.id}-${idx}`} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  {getActivityIcon(activity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{activity.name}</p>
                      <span className="text-sm font-semibold text-slate-700 flex-shrink-0">
                        {formatCurrency(activity.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{getActivityLabel(activity)}</span>
                      {activity.category_name && (
                        <span className="text-xs text-slate-400">• {activity.category_name}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(new Date(activity.date), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No recent activity
              </div>
            )}
          </div>
          {recentActivity && recentActivity.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <a href="/expenses" className="text-sm text-brandNavy hover:underline">View all activity →</a>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Upcoming Events</h3>
            <p className="text-xs text-slate-500 mt-1">Scheduled budgets and pending breakdowns</p>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, idx) => (
                <div key={`${event.type}-${event.id}-${idx}`} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  {getEventIcon(event)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{event.name}</p>
                      <span className="text-sm font-semibold text-slate-700 flex-shrink-0">
                        {formatCurrency(event.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        {event.event_type === 'budget_date' ? 'Budget Date' : 'Breakdown Due'}
                      </span>
                      {event.expense_name && (
                        <span className="text-xs text-slate-400">• {event.expense_name}</span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-600 font-medium mt-1">
                      {formatDate(new Date(event.date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No upcoming events
              </div>
            )}
          </div>
          {upcomingEvents && upcomingEvents.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <a href="/budgets" className="text-sm text-brandNavy hover:underline">View all budgets →</a>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDonut
          data={categoryBreakdown.map(c => ({
            category: c.category,
            total: c.total
          }))}
        />
        <MonthlyTrend data={monthlyTrend} />
      </div>

      {/* Recent Expenses Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Recent Expenses</h3>
            <p className="text-xs text-slate-500 mt-1">Latest expense records</p>
          </div>
          <a href="/expenses" className="text-sm text-brandNavy hover:underline">
            View all
          </a>
        </div>
        {recentExpenses && recentExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Category</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Amount</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatDate(new Date(expense.expense_date), 'dd MMM yyyy')}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{expense.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{expense.category_name || '-'}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900 text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          expense.status === 'approved' ? 'success' :
                            expense.status === 'rejected' ? 'danger' : 'warning'
                        }
                      >
                        {expense.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            No expenses recorded yet
          </div>
        )}
      </div>
    </div>
  );
}