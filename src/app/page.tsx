'use client';
import { useState } from 'react';
import StatCard from '../components/cards/StatCard';
import Alerts from '../components/Alerts';
import CategoryDonut from '../components/charts/CategoryDonut';
import MonthlyTrend from '../components/charts/MonthlyTrend';
import EventBars from '../components/charts/EventBars';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import { getAnalytics, mockExpenses, mockMonthlyData, mockCategoryData, mockEvents } from '../data/mock';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const analytics = getAnalytics();

  const recentExpenses = mockExpenses.slice(0, 5);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'activity', label: 'Recent Activity' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brandPrimary uppercase tracking-wider">
            JSPM&apos;s RSCOE · CSBS Department
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Budget Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Fiscal Year {analytics.fiscalYear} · Real-time expense monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">Live Data</Badge>
          <span className="text-xs text-slate-400">Last updated: Just now</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs. map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab. key
                  ?  'bg-white border border-b-white border-slate-200 text-brandNavy -mb-px'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Alerts */}
      <Alerts utilization={analytics.utilization} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Allotted"
          value={`₹${(analytics.allotted / 100000).toFixed(1)}L`}
          subtitle="Annual budget"
          accent
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3.895-3 2s1.343 2 3 2 3.895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Spent"
          value={`₹${(analytics.totalSpent / 100000).toFixed(2)}L`}
          subtitle={`${analytics.utilization. toFixed(1)}% utilized`}
          trend={{ value: 12, label: 'vs last month' }}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          title="Remaining"
          value={`₹${(analytics.remaining / 100000).toFixed(2)}L`}
          subtitle="Available balance"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Approvals"
          value={analytics.pendingCount. toString()}
          subtitle="Awaiting review"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Budget Utilization Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Budget Utilization</h3>
          <span className="text-sm text-slate-500">FY {analytics.fiscalYear}</span>
        </div>
        <ProgressBar
          value={analytics.totalSpent}
          max={analytics.allotted}
          size="lg"
        />
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-slate-500">
            Spent: <span className="font-medium text-slate-900">₹{analytics. totalSpent.toLocaleString('en-IN')}</span>
          </span>
          <span className="text-slate-500">
            Remaining: <span className="font-medium text-green-600">₹{analytics. remaining.toLocaleString('en-IN')}</span>
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDonut data={mockCategoryData} />
        <MonthlyTrend data={mockMonthlyData} />
      </div>

      {/* Event Spending */}
      <EventBars data={mockEvents. map((e) => ({ event: e.name, total: e.spending }))} />

      {/* Recent Expenses Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Expenses</h3>
        </div>
        <Table
          columns={[
            { key: 'date', header: 'Date' },
            { key: 'category', header: 'Category' },
            { key: 'description', header: 'Description', className: 'max-w-xs truncate' },
            { key: 'vendor', header: 'Vendor' },
            {
              key: 'amount',
              header: 'Amount',
              render: (row) => (
                <span className="font-medium text-slate-900">₹{row.amount.toLocaleString('en-IN')}</span>
              ),
            },
            {
              key:  'status',
              header: 'Status',
              render: (row) => (
                <Badge variant={row.status === 'approved' ? 'success' : 'warning'}>
                  {row.status}
                </Badge>
              ),
            },
          ]}
          data={recentExpenses}
        />
      </div>
    </div>
  );
}