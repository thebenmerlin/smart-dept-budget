'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import BreakdownModal from '@/components/ui/BreakdownModal';
import { formatCurrency, formatDate, getCurrentFiscalYear, getFiscalYearOptions } from '@/lib/utils';

interface BudgetBreakdown {
  id?: number;
  name: string;
  amount: number | string;
  payment_method: string;
}

interface Budget {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  category_name: string | null;
  description: string | null;
  source: string | null;
  payment_method: string;
  budget_date: string;
  fiscal_year: string;
  status: string;
  created_by_name: string;
  created_at: string;
  breakdowns: BudgetBreakdown[];
}

interface Category {
  id: number;
  name: string;
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    period: '',
    category_id: '',
    source: '',
    fiscal_year: getCurrentFiscalYear(),
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category_id: '',
    description: '',
    source: '',
    payment_method: 'cash',
    budget_date: new Date().toISOString().split('T')[0],
  });

  const [breakdownItems, setBreakdownItems] = useState<BudgetBreakdown[]>([
    { name: '', amount: '', payment_method: 'cash' },
  ]);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      let url = '/api/budgets-new?';
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (filters.category_id) url += `category_id=${filters.category_id}&`;
      if (filters.source) url += `source=${encodeURIComponent(filters.source)}&`;
      if (filters.period) url += `period=${filters.period}&`;
      if (filters.fiscal_year) url += `fiscal_year=${filters.fiscal_year}&`;

      const response = await fetch(url, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setBudgets(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setCategories(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [filters]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchBudgets();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      category_id: '',
      description: '',
      source: '',
      payment_method: 'cash',
      budget_date: new Date().toISOString().split('T')[0],
    });
    setBreakdownItems([{ name: '', amount: '', payment_method: 'cash' }]);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openViewModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      name: budget.name,
      amount: budget.amount.toString(),
      category_id: budget.category_id?.toString() || '',
      description: budget.description || '',
      source: budget.source || '',
      payment_method: budget.payment_method,
      budget_date: budget.budget_date.split('T')[0],
    });
    setBreakdownItems(
      budget.breakdowns && budget.breakdowns.length > 0
        ? budget.breakdowns.map(b => ({ ...b, amount: b.amount.toString() }))
        : [{ name: '', amount: '', payment_method: 'cash' }]
    );
    setIsEditMode(false);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const validBreakdowns = breakdownItems.filter(b => b.name && b.amount);
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        breakdowns: validBreakdowns.map(b => ({
          name: b.name,
          amount: parseFloat(b.amount.toString()),
          payment_method: b.payment_method,
        })),
      };

      const response = await fetch('/api/budgets-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setIsAddModalOpen(false);
        resetForm();
        fetchBudgets();
      } else {
        alert(result.error || 'Failed to create budget');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBudget || !formData.name || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const validBreakdowns = breakdownItems.filter(b => b.name && b.amount);
      const payload = {
        id: selectedBudget.id,
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        breakdowns: validBreakdowns.map(b => ({
          name: b.name,
          amount: parseFloat(b.amount.toString()),
          payment_method: b.payment_method,
        })),
      };

      const response = await fetch('/api/budgets-new', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setIsViewModalOpen(false);
        setIsEditMode(false);
        fetchBudgets();
      } else {
        alert(result.error || 'Failed to update budget');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      const response = await fetch(`/api/budgets-new?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setIsViewModalOpen(false);
        fetchBudgets();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const addBreakdownRow = () => {
    setBreakdownItems([...breakdownItems, { name: '', amount: '', payment_method: 'cash' }]);
  };

  const removeBreakdownRow = (index: number) => {
    if (breakdownItems.length > 1) {
      setBreakdownItems(breakdownItems.filter((_, i) => i !== index));
    }
  };

  const updateBreakdownItem = (index: number, field: keyof BudgetBreakdown, value: string) => {
    const updated = [...breakdownItems];
    (updated[index] as any)[field] = value;
    setBreakdownItems(updated);
  };

  const breakdownTotal = breakdownItems.reduce((sum, item) => sum + (parseFloat(item.amount.toString()) || 0), 0);

  const renderBreakdownForm = (readonly: boolean = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">Budget Breakdown</label>
        <button
          type="button"
          onClick={() => setIsBreakdownModalOpen(true)}
          className="text-xs text-brandNavy hover:underline flex items-center gap-1 px-2 py-1 rounded hover:bg-brandNavy/5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Expand
        </button>
      </div>

      {/* Inline breakdown items - always visible */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {breakdownItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <Input
              placeholder="Name"
              value={item.name}
              onChange={(e) => updateBreakdownItem(index, 'name', e.target.value)}
              disabled={readonly}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Amount"
              value={item.amount}
              onChange={(e) => updateBreakdownItem(index, 'amount', e.target.value)}
              disabled={readonly}
              className="w-28"
            />
            <select
              value={item.payment_method}
              onChange={(e) => updateBreakdownItem(index, 'payment_method', e.target.value)}
              disabled={readonly}
              className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
            {!readonly && breakdownItems.length > 1 && (
              <button type="button" onClick={() => removeBreakdownRow(index)} className="p-1 text-red-500 hover:text-red-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {!readonly && (
        <Button type="button" variant="outline" size="sm" onClick={addBreakdownRow} className="w-full">
          + Add Breakdown Item
        </Button>
      )}

      <div className="text-right text-sm text-slate-600">
        Breakdown Total: <span className="font-semibold text-brandNavy">{formatCurrency(breakdownTotal)}</span>
      </div>

      {/* Breakdown Modal for expanded view */}
      <BreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        title="Budget Breakdown"
        items={breakdownItems}
        onItemsChange={setBreakdownItems}
        readonly={readonly}
        type="budget"
      />
    </div>
  );

  if (isLoading && budgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandNavy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all budgets</p>
        </div>
        <Button onClick={openAddModal}>+ Add Budget</Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search budgets by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6. 414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-. 293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Time</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="semester">This Semester</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
              <Input
                placeholder="Filter by source..."
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fiscal Year</label>
              <select
                value={filters.fiscal_year}
                onChange={(e) => setFilters({ ...filters, fiscal_year: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                {getFiscalYearOptions().map((fy) => (
                  <option key={fy} value={fy}>FY {fy}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {budgets.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No budgets found</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {budgets.map((budget) => (
              <div
                key={budget.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => openViewModal(budget)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{budget.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {budget.category_name && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{budget.category_name}</span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(budget.budget_date, 'dd MMM yyyy')}</span>
                      {budget.source && (
                        <span className="text-xs text-blue-600">{budget.source}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-brandNavy">{formatCurrency(Number(budget.amount))}</p>
                    <Badge variant={budget.status === 'active' ? 'success' : budget.status === 'completed' ? 'info' : 'danger'}>
                      {budget.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-brandNavy bg-brandNavy/5 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-slate-700">Total Budget</span>
          <span className="text-2xl font-bold text-brandNavy">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Add Budget Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Budget" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Budget Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={formData.budget_date}
              onChange={(e) => setFormData({ ...formData, budget_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Budget description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input
              label="Source (Where the money came from)"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., College Fund, Sponsorship"
            />
          </div>

          {renderBreakdownForm(false)}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Add Budget</Button>
          </div>
        </form>
      </Modal>

      {/* View/Edit Budget Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setIsEditMode(false); }} title={isEditMode ? "Edit Budget" : "Budget Details"} size="lg">
        <div className="space-y-4">
          {!isEditMode ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Name</label>
                  <p className="font-medium text-slate-900">{selectedBudget?.name}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Amount</label>
                  <p className="font-bold text-brandNavy text-lg">{formatCurrency(Number(selectedBudget?.amount || 0))}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Category</label>
                  <p className="font-medium text-slate-900">{selectedBudget?.category_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <p className="font-medium text-slate-900">{selectedBudget?.budget_date ? formatDate(selectedBudget.budget_date, 'dd MMM yyyy') : 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Description</label>
                <p className="font-medium text-slate-900">{selectedBudget?.description || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Payment Method</label>
                  <p className="font-medium text-slate-900 capitalize">{selectedBudget?.payment_method}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Source</label>
                  <p className="font-medium text-slate-900">{selectedBudget?.source || 'N/A'}</p>
                </div>
              </div>

              {selectedBudget?.breakdowns && selectedBudget.breakdowns.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Breakdown</label>
                  <div className="space-y-2">
                    {selectedBudget.breakdowns.map((bd, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                        <span className="font-medium">{bd.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 capitalize">{bd.payment_method}</span>
                          <span className="font-semibold text-brandNavy">{formatCurrency(Number(bd.amount))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button variant="danger" onClick={() => handleDelete(selectedBudget!.id)}>Delete</Button>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                  <Button onClick={() => setIsEditMode(true)}>Edit</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Budget Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Amount *"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Date"
                  type="date"
                  value={formData.budget_date}
                  onChange={(e) => setFormData({ ...formData, budget_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Input
                  label="Source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                />
              </div>

              {renderBreakdownForm(false)}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setIsEditMode(false)}>Cancel</Button>
                <Button onClick={handleUpdate} isLoading={isSubmitting}>Save Changes</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}