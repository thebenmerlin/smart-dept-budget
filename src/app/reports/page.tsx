'use client';

import { useState } from 'react';
import { useRole } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { getCurrentFiscalYear, getFiscalYearOptions } from '@/lib/utils';

const reportTypes = [
  {
    id: 'monthly',
    title: 'Monthly Expense Report',
    description: 'Detailed breakdown of expenses by month and category',
    icon: '📊',
    formats: ['pdf', 'csv'],
  },
  {
    id: 'category',
    title:  'Category-wise Budget Report',
    description: 'Budget allocation, spending, and variance by category',
    icon: '📁',
    formats:  ['pdf', 'csv'],
  },
  {
    id: 'budget',
    title:  'Budget Variance Report',
    description: 'Proposed vs allotted budget comparison',
    icon:  '💰',
    formats:  ['pdf', 'csv'],
  },
  {
    id: 'vendor',
    title:  'Vendor-wise Report',
    description:  'Expenses grouped by vendor/payee',
    icon: '🏢',
    formats: ['pdf', 'csv'],
  },
  {
    id: 'audit',
    title: 'Audit Trail Report',
    description: 'Complete log of all system activities',
    icon:  '🔍',
    formats: ['pdf', 'csv'],
  },
  {
    id: 'expenses',
    title: 'Detailed Expenses Report',
    description: 'Complete list of all expenses with details',
    icon: '📋',
    formats: ['pdf', 'csv'],
  },
];

export default function ReportsPage() {
  const { canDownloadReports } = useRole();
  const [generating, setGenerating] = useState<string | null>(null);
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDownload = async (reportType: string, format: 'pdf' | 'csv') => {
    if (!canDownloadReports) {
      setError('You do not have permission to download reports');
      return;
    }

    setGenerating(`${reportType}-${format}`);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/reports/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: reportType,
          fiscal_year: fiscalYear,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          format,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const contentDisposition = response. headers.get('Content-Disposition');
      let filename = `${reportType}-report-${fiscalYear}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition. match(/filename="(. +)"/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = window. URL.createObjectURL(blob);
      const a = document. createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage(`${reportType. charAt(0).toUpperCase() + reportType.slice(1)} report downloaded successfully! `);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err:  any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  if (! canDownloadReports) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports and Exports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and download comprehensive reports
          </p>
        </div>
        <div className="p-8 text-center rounded-xl border border-slate-200 bg-white">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-500">
            Only HOD and Admin users can download reports.  Contact your administrator for access. 
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports and Exports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and download comprehensive reports for analysis and compliance
          </p>
        </div>
        <Badge variant="info">NBA/NAAC Ready</Badge>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fiscal Year</label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target. value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus: ring-brandNavy/50"
            >
              {getFiscalYearOptions().map((fy) => (
                <option key={fy} value={fy}>FY {fy}</option>
              ))}
            </select>
          </div>
          <Input
            label="Start Date (Optional)"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target. value)}
          />
          <Input
            label="End Date (Optional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e. target.value)}
          />
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h. 01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => (
          <div
            key={report. id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{report.icon}</span>
              <div className="flex gap-1">
                {report.formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="text-xs uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{report.description}</p>
            <div className="flex gap-2">
              {report.formats.includes('pdf') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(report.id, 'pdf')}
                  isLoading={generating === `${report.id}-pdf`}
                  className="flex-1"
                >
                  PDF
                </Button>
              )}
              {report.formats. includes('csv') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(report.id, 'csv')}
                  isLoading={generating === `${report.id}-csv`}
                  className="flex-1"
                >
                  CSV
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900">NBA/NAAC Compliance</h4>
            <p className="text-sm text-blue-700 mt-1">
              All reports are formatted to meet accreditation requirements. The Category-wise and Budget Variance
              reports are specifically designed for NBA/NAAC documentation.  Reports include department details,
              fiscal year information, and are timestamped for audit purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}