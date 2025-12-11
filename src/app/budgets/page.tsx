'use client';

import { useState } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useAuth, useRole } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatCurrency, getCurrentFiscalYear, getFiscalYearOptions } from '@/lib/utils';

interface BudgetFormData {
  category_id: number;
  amount:  string;
  notes:  string;
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const { canManageBudgets } = useRole();
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const { data, isLoading, error, createPlan, createAllotment, refresh } = useBudgets(fiscalYear);
  
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAllotmentModalOpen, setIsAllotmentModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>({
    category_id: 0,
    amount: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenPlanModal = (categoryId: number) => {
    const budget = data?.budgets. find(b => b.category_id === categoryId);
    setSelectedCategory(categoryId);
    setFormData({
      category_id: categoryId,
      amount:  budget?.proposed_amount?. toString() || '',
      notes: '',
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenAllotmentModal = (categoryId: number) => {
    const budget = data?.budgets. find(b => b.category_id === categoryId);
    setSelectedCategory(categoryId);
    setFormData({
      category_id: categoryId,
      amount: budget?.allotted_amount?.toString() || '',
      notes: '',
    });
    setIsAllotmentModalOpen(true);
  };

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData.amount) return;

    setIsSubmitting(true);
    const result = await createPlan(
      selectedCategory,
      parseFloat(formData. amount),
      formData.notes
    );
    setIsSubmitting(false);

    if (result. success) {
      setIsPlanModalOpen(false);
      setFormData({ category_id: 0, amount: '', notes: '' });
    }
  };

  const handleSubmitAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData.amount) return;

    setIsSubmitting(true);
    const result = await createAllotment(
      selectedCategory,
      parseFloat(formData.amount),
      formData. notes
    );
    setIsSubmitting(false);

    if (result.success) {
      setIsAllotmentModalOpen(false);
      setFormData({ category_id: 0, amount: '', notes: '' });
    }
  };

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

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Planning</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage proposed and allocated budgets by category
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target. value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus: ring-brandNavy/50"
          >
            {getFiscalYearOptions().map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => refresh()}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h. 582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Proposed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totals?.proposed || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Allotted</p>
          <p className="text-2xl font-bold text-brandNavy mt-1">
            {formatCurrency(totals?.allotted || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Spent</p>
          <p className="text-2xl font-bold text-brandPrimary mt-1">
            {formatCurrency(totals?.spent || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Overall Variance</p>
          <p className={`text-2xl font-bold mt-1 ${(totals?.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(totals?.variance || 0) >= 0 ?  '+' : ''}{formatCurrency(totals?.variance || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {(totals?.variance || 0) >= 0 ? 'Surplus' : 'Deficit'}
          </p>
        </div>
      </div>

      {/* Budget Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Category-wise Budget Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Proposed</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Allotted</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Variance</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Spent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Utilization</th>
                {canManageBudgets && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {data?.budgets. map((budget) => (
                <tr key={budget.category_id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{budget.category_name}</p>
                      <p className="text-xs text-slate-500">{budget.category_description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-slate-900">
                      {formatCurrency(budget. proposed_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-brandNavy">
                      {formatCurrency(budget.allotted_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`text-sm font-medium ${budget.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {budget.variance >= 0 ? '+' : ''}{formatCurrency(budget.variance)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-slate-900">
                      {formatCurrency(budget.spent_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 w-48">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={budget.utilization}
                        max={100}
                        size="sm"
                        showPercent={false}
                      />
                      <span className="text-xs text-slate-600 w-12">
                        {budget.utilization. toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  {canManageBudgets && (
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPlanModal(budget.category_id)}
                        >
                          Propose
                        </Button>
                        {user?. role === 'admin' || user?.role === 'hod' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenAllotmentModal(budget.category_id)}
                          >
                            Allot
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-slate-100">
              <tr>
                <td className="px-4 py-4 font-semibold text-slate-900">Total</td>
                <td className="px-4 py-4 text-right font-semibold text-slate-900">
                  {formatCurrency(totals?.proposed || 0)}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-brandNavy">
                  {formatCurrency(totals?.allotted || 0)}
                </td>
                <td className={`px-4 py-4 text-right font-semibold ${(totals?.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(totals?.variance || 0) >= 0 ? '+' : ''}{formatCurrency(totals?.variance || 0)}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-slate-900">
                  {formatCurrency(totals?. spent || 0)}
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-semibold text-slate-900">
                    {(totals?.utilization || 0).toFixed(1)}%
                  </span>
                </td>
                {canManageBudgets && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Propose Budget Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Propose Budget"
        size="sm"
      >
        <form onSubmit={handleSubmitPlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <p className="text-lg font-semibold text-slate-900">
              {data?.budgets.find(b => b. category_id === selectedCategory)?.category_name}
            </p>
          </div>
          <Input
            label="Proposed Amount (₹)"
            type="number"
            value={formData. amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target. value })}
            placeholder="Enter amount"
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Justification</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target. value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus: outline-none focus: ring-2 focus:ring-brandNavy/50"
              placeholder="Provide justification for this budget..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Proposal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Allot Budget Modal */}
      <Modal
        isOpen={isAllotmentModalOpen}
        onClose={() => setIsAllotmentModalOpen(false)}
        title="Allocate Budget"
        size="sm"
      >
        <form onSubmit={handleSubmitAllotment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <p className="text-lg font-semibold text-slate-900">
              {data?.budgets.find(b => b.category_id === selectedCategory)?.category_name}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              Proposed:  <span className="font-semibold">
                {formatCurrency(data?.budgets.find(b => b.category_id === selectedCategory)?.proposed_amount || 0)}
              </span>
            </p>
          </div>
          <Input
            label="Allotted Amount (₹)"
            type="number"
            value={formData. amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="Enter amount"
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e. target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
              placeholder="Add any notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsAllotmentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" isLoading={isSubmitting}>
              Save Allotment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}