'use client';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getAnalytics, mockCategoryData, mockMonthlyData } from '../../data/mock';

const reportTypes = [
  {
    id: 'monthly',
    title: 'Monthly Expense Report',
    description: 'Detailed breakdown of expenses by month',
    icon:  '📊',
    format: 'PDF / Excel',
  },
  {
    id: 'category',
    title:  'Category-wise Report',
    description:  'Expenses grouped by category with totals',
    icon: '📁',
    format:  'PDF / Excel',
  },
  {
    id: 'budget',
    title:  'Budget Variance Report',
    description: 'Proposed vs allotted vs actual spending',
    icon: '💰',
    format: 'PDF',
  },
  {
    id:  'audit',
    title:  'Audit Trail Report',
    description:  'Complete log of all transactions and changes',
    icon: '🔍',
    format: 'PDF / Excel',
  },
  {
    id:  'nba',
    title:  'NBA/NAAC Compliance Report',
    description: 'Formatted for accreditation submissions',
    icon:  '🎓',
    format:  'PDF',
  },
  {
    id:  'vendor',
    title:  'Vendor-wise Report',
    description: 'Expenses grouped by vendor/payee',
    icon: '🏢',
    format: 'Excel',
  },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const analytics = getAnalytics();

  const handleGenerate = (reportId: string) => {
    setGenerating(reportId);
    setTimeout(() => {
      setGenerating(null);
      alert(`${reportId} report generated successfully!  (Demo)`);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Exports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and download comprehensive reports
          </p>
        </div>
        <Badge variant="info">FY {analytics.fiscalYear}</Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-brandNavy">₹{(analytics.totalSpent / 100000).toFixed(2)}L</p>
          <p className="text-xs text-slate-500 mt-1">Total Spent</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">{mockCategoryData.length}</p>
          <p className="text-xs text-slate-500 mt-1">Categories</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">{mockMonthlyData.filter((m) => m.total > 0).length}</p>
          <p className="text-xs text-slate-500 mt-1">Active Months</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{analytics.utilization. toFixed(0)}%</p>
          <p className="text-xs text-slate-500 mt-1">Utilization</p>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => (
          <div
            key={report. id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{report.icon}</span>
              <span className="text-xs text-slate-400">{report.format}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{report.description}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleGenerate(report.id)}
                isLoading={generating === report.id}
                className="flex-1"
              >
                Generate
              </Button>
              <Button size="sm" variant="outline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Downloads */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Downloads</h3>
        </div>
        <div className="p-5">
          <div className="text-center py-8 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No reports generated yet</p>
            <p className="text-xs mt-1">Generate a report above to see it here</p>
          </div>
        </div>
      </div>
    </div>
  );
}