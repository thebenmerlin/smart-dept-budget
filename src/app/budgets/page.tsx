'use client';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import BudgetForm from '../../components/forms/BudgetForm';
import { mockBudgets, getAnalytics } from '../../data/mock';

export default function BudgetsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgets, setBudgets] = useState(mockBudgets);
  const analytics = getAnalytics();

  const handleSubmit = (data: any) => {
    const newBudget = {
      id: budgets.length + 1,
      fiscalYear: data. fiscalYear,
      proposedAmount: Number(data.proposedAmount),
      allottedAmount: Number(data.allottedAmount),
      variance: data.variance,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBudgets([newBudget, ... budgets]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md: flex-row md: items-center md: justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Planning</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage annual budget proposals and allotments
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Budget Plan
        </Button>
      </div>

      {/* Current Year Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Proposed Amount</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{(analytics.proposed / 100000).toFixed(1)}L
          </p>
          <p className="text-xs text-slate-400 mt-1">FY {analytics.fiscalYear}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Allotted Amount</p>
          <p className="text-2xl font-bold text-brandNavy mt-1">
            ₹{(analytics. allotted / 100000).toFixed(1)}L
          </p>
          <p className="text-xs text-slate-400 mt-1">Approved by Institute</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Variance</p>
          <p className={`text-2xl font-bold mt-1 ${analytics.allotted - analytics.proposed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.allotted - analytics.proposed >= 0 ? '+' : ''}₹{((analytics.allotted - analytics.proposed) / 100000).toFixed(1)}L
          </p>
          <p className="text-xs text-slate-400 mt-1">Shortfall/Excess</p>
        </div>
      </div>

      {/* Utilization */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Current Year Utilization</h3>
        <ProgressBar value={analytics.utilization} label="Budget Used" size="lg" />
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Total Spent</p>
            <p className="text-lg font-semibold text-slate-900">₹{analytics. totalSpent.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Remaining</p>
            <p className="text-lg font-semibold text-green-600">₹{analytics.remaining. toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pending Expenses</p>
            <p className="text-lg font-semibold text-amber-600">{analytics.pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Budget History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Budget History</h3>
        </div>
        <Table
          columns={[
            { key: 'fiscalYear', header:  'Fiscal Year' },
            {
              key: 'proposedAmount',
              header: 'Proposed',
              render: (row) => `₹${row. proposedAmount.toLocaleString('en-IN')}`,
            },
            {
              key: 'allottedAmount',
              header:  'Allotted',
              render: (row) => `₹${row.allottedAmount.toLocaleString('en-IN')}`,
            },
            {
              key: 'variance',
              header:  'Variance',
              render: (row) => (
                <span className={row.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {row.variance >= 0 ? '+' :  ''}₹{row.variance.toLocaleString('en-IN')}
                </span>
              ),
            },
            {
              key: 'status',
              header:  'Status',
              render: (row) => (
                <Badge variant={row.status === 'approved' ? 'success' : row.status === 'closed' ? 'default' : 'warning'}>
                  {row.status}
                </Badge>
              ),
            },
            { key: 'createdAt', header:  'Created' },
          ]}
          data={budgets}
        />
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Budget Plan" size="md">
        <BudgetForm onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}