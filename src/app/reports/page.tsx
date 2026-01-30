'use client';

import { useState, useEffect } from 'react';
import { useRole, useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ReportPreview from '@/components/reports/ReportPreview';
import { formatCurrency, formatDate } from '@/lib/utils';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const COLLEGE_NAME = "JSPM's Rajarshi Shahu College of Engineering";

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let i = -1; i < 5; i++) {
    years.push((currentYear - i).toString());
  }
  return years;
}

interface Semester {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export default function ReportsPage() {
  const { canDownloadReports } = useRole();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'budget' | 'expense'>('budget');
  const [fromMonth, setFromMonth] = useState('1');
  const [toMonth, setToMonth] = useState('12');
  const [fromYear, setFromYear] = useState(new Date().getFullYear().toString());
  const [toYear, setToYear] = useState(new Date().getFullYear().toString());

  const [reportData, setReportData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSingleExporting, setIsSingleExporting] = useState<string | null>(null);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: activeTab,
        from_month: fromMonth,
        to_month: toMonth,
        from_year: fromYear,
        to_year: toYear,
      });

      const response = await fetch(`/api/reports/report-data?${params}`, {
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        setReportData(result.data || []);
        setTotal(result.total || 0);
      } else {
        setError(result.error || 'Failed to fetch report data');
      }
    } catch (err: any) {
      setError('Network error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canDownloadReports) {
      fetchReportData();
    }
  }, [activeTab, fromMonth, toMonth, fromYear, toYear, canDownloadReports]);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const response = await fetch('/api/semesters', { credentials: 'include' });
        const result = await response.json();
        if (result.success) {
          setSemesters(result.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch semesters:', err);
      }
    };
    fetchSemesters();
  }, []);

  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemester(semesterId);
    if (semesterId) {
      const semester = semesters.find(s => s.id === parseInt(semesterId));
      if (semester) {
        const startDate = new Date(semester.start_date);
        const endDate = new Date(semester.end_date);
        setFromMonth((startDate.getMonth() + 1).toString());
        setToMonth((endDate.getMonth() + 1).toString());
        setFromYear(startDate.getFullYear().toString());
        setToYear(endDate.getFullYear().toString());
      }
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(format);
    try {
      const response = await fetch('/api/reports/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: activeTab,
          format,
          from_month: fromMonth,
          to_month: toMonth,
          from_year: fromYear,
          to_year: toYear,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${activeTab}-report-${fromYear}${fromYear !== toYear ? '-' + toYear : ''}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    } finally {
      setIsExporting(null);
    }
  };

  const getDateRangeString = () => {
    const fromMonthName = MONTHS.find(m => m.value === fromMonth)?.label || '';
    const toMonthName = MONTHS.find(m => m.value === toMonth)?.label || '';
    if (fromMonth === toMonth && fromYear === toYear) {
      return `${fromMonthName} ${fromYear}`;
    }
    if (fromYear === toYear) {
      return `${fromMonthName} - ${toMonthName} ${fromYear}`;
    }
    return `${fromMonthName} ${fromYear} - ${toMonthName} ${toYear}`;
  };

  const handleRowClick = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleSingleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedItem) return;

    setIsSingleExporting(format);
    try {
      const response = await fetch('/api/reports/export-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: activeTab,
          id: selectedItem.id,
          format,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-${selectedItem.name.replace(/[^a-zA-Z0-9]/g, '-')}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export');
    } finally {
      setIsSingleExporting(null);
    }
  };

  if (!canDownloadReports) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Exports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and download comprehensive reports
          </p>
        </div>
        <div className="p-8 text-center rounded-xl border border-slate-200 bg-white">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-500">
            Only HOD and Admin users can download reports. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Exports</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and export Budget and Expense reports
          </p>
        </div>
        <Badge variant="info">NBA/NAAC Ready</Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'budget'
            ? 'border-brandNavy text-brandNavy'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          Budget Report
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'expense'
            ? 'border-brandNavy text-brandNavy'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          Expense Report
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Report Filters</h3>
        {semesters.length > 0 && (
          <div className="mb-4 pb-4 border-b border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">Quick Select: Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
            >
              <option value="">Select a semester...</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>{sem.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Or manually select date range below</p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Month</label>
            <select
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Year</label>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
            >
              {getYearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Month</label>
            <select
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Year</label>
            <select
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
            >
              {getYearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            <Button onClick={fetchReportData} variant="outline" className="w-full">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Report Preview */}
      <ReportPreview
        type={activeTab}
        data={reportData}
        total={total}
        collegeName={COLLEGE_NAME}
        departmentName="Computer Science and Business Systems"
        dateRange={getDateRangeString()}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {/* Export Buttons */}
      {reportData.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport('excel')}
            isLoading={isExporting === 'excel'}
            className="min-w-[140px]"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('pdf')}
            isLoading={isExporting === 'pdf'}
            className="min-w-[140px]"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </Button>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900">Export Individual Budgets and Expenses</h4>
            <p className="text-sm text-blue-700 mt-1">
              Export individual budgets and expenses by clicking on individual budget or expense row in the above tables.
            </p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`${activeTab === 'budget' ? 'Budget' : 'Expense'} Details`}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <p className="font-medium text-slate-900">{selectedItem.name}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Amount</label>
                <p className="font-semibold text-brandNavy text-lg">{formatCurrency(Number(selectedItem.amount))}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Date</label>
                <p className="font-medium text-slate-700">
                  {formatDate(selectedItem.budget_date || selectedItem.expense_date, 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Category</label>
                <p className="text-slate-700">{selectedItem.category_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Payment Method</label>
                <p className="text-slate-700 capitalize">{selectedItem.payment_method}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedItem.status === 'approved' || selectedItem.status === 'active' ? 'bg-green-100 text-green-700' :
                  selectedItem.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    selectedItem.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                  }`}>
                  {selectedItem.status}
                </span>
              </div>
              {activeTab === 'budget' && (
                <div>
                  <label className="text-xs text-slate-500">Source</label>
                  <p className="text-slate-700">{selectedItem.source || 'N/A'}</p>
                </div>
              )}
              {activeTab === 'expense' && (
                <>
                  <div>
                    <label className="text-xs text-slate-500">Spender</label>
                    <p className="text-slate-700">{selectedItem.spender || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Against Budget</label>
                    <p className="text-slate-700">{selectedItem.budget_name || 'N/A'}</p>
                  </div>
                </>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => handleSingleExport('excel')}
                isLoading={isSingleExporting === 'excel'}
                className="flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSingleExport('pdf')}
                isLoading={isSingleExporting === 'pdf'}
                className="flex-1"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}