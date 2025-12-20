'use client';

import { useState, useEffect } from 'react';
import { useAuth, useRole } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Category {
  id:  number;
  name:  string;
  description:  string;
}

interface SubExpense {
  id: number;
  expense_id: number;
  name: string;
  amount: number;
  description: string | null;
}

interface Expense {
  id: number;
  category_id: number;
  category_name: string;
  event_id: number | null;
  event_name: string | null;
  amount: number;
  vendor:  string;
  expense_date: string;
  description: string | null;
  invoice_number: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  created_by_name: string;
  rejection_reason: string | null;
  created_at: string;
}

interface SubExpenseItem {
  name: string;
  amount: string;
  description:  string;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { canApprove } = useRole();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedExpenses, setExpandedExpenses] = useState<Set<number>>(new Set());
  const [subExpensesMap, setSubExpensesMap] = useState<Record<number, SubExpense[]>>({});

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isSubExpenseModalOpen, setIsSubExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    category_id:  '',
    amount:  '',
    vendor:  '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    invoice_number: '',
  });

  const [subExpenseItems, setSubExpenseItems] = useState<SubExpenseItem[]>([
    { name: '', amount: '', description:  '' },
  ]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // FIX:  Removed the space before 'limit' in the URL
      let url = '/api/expenses? limit=100';
      if (statusFilter) url += '&status=' + statusFilter;
      if (categoryFilter) url += '&category_id=' + categoryFilter;

      const response = await fetch(url, { credentials: 'include' });
      const result = await response.json();

      if (result. success && result.data) {
        let filtered = result.data. expenses;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter((e:  Expense) =>
            e.vendor.toLowerCase().includes(query) ||
            (e.description && e.description.toLowerCase().includes(query)) ||
            e. category_name.toLowerCase().includes(query) ||
            (e.invoice_number && e.invoice_number.toLowerCase().includes(query))
          );
        }
        setExpenses(filtered);
      } else {
        setError(result.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories', { credentials:  'include' });
      const result = await response.json();
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchSubExpenses = async (expenseId: number) => {
    try {
      // FIX:  Removed the space before 'expense_id' in the URL
      const response = await fetch('/api/sub-expenses?expense_id=' + expenseId, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success && result.data) {
        setSubExpensesMap(prev => {
          const updated = { ...prev };
          updated[expenseId] = result.data;
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to fetch sub-expenses:', err);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchExpenses();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const toggleExpense = (expenseId: number) => {
    const newExpanded = new Set(expandedExpenses);
    if (newExpanded.has(expenseId)) {
      newExpanded. delete(expenseId);
    } else {
      newExpanded.add(expenseId);
      if (! subExpensesMap[expenseId]) {
        fetchSubExpenses(expenseId);
      }
    }
    setExpandedExpenses(newExpanded);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/expenses', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category_id: parseInt(formData.category_id),
          amount: parseFloat(formData.amount),
          vendor: formData.vendor,
          expense_date:  formData.expense_date,
          description: formData.description,
          invoice_number: formData. invoice_number,
        }),
      });
      const result = await response.json();

      if (result. success) {
        setIsCreateModalOpen(false);
        setFormData({
          category_id: '',
          amount: '',
          vendor: '',
          expense_date: new Date().toISOString().split('T')[0],
          description: '',
          invoice_number: '',
        });
        fetchExpenses();
      } else {
        alert(result.error || 'Failed to create expense');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (expense: Expense) => {
    try {
      const response = await fetch('/api/expenses/' + expense.id, {
        method:  'PUT',
        headers:  { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });
      const result = await response.json();
      if (result.success) {
        fetchExpenses();
      }
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleReject = async () => {
    if (! selectedExpense || ! rejectReason. trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/expenses/' + selectedExpense.id, {
        method:  'PUT',
        headers: { 'Content-Type':  'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected', rejection_reason: rejectReason }),
      });
      const result = await response.json();
      if (result.success) {
        setIsRejectModalOpen(false);
        setRejectReason('');
        setSelectedExpense(null);
        fetchExpenses();
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (! confirm('Are you sure you want to delete this expense?')) return;
    try {
      const response = await fetch('/api/expenses/' + expense.id, {
        method:  'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        fetchExpenses();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const openRejectModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsRejectModalOpen(true);
  };

  const openSubExpenseModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setSubExpenseItems([{ name: '', amount:  '', description: '' }]);
    setIsSubExpenseModalOpen(true);
  };

  const addSubExpenseRow = () => {
    setSubExpenseItems([... subExpenseItems, { name: '', amount: '', description: '' }]);
  };

  const removeSubExpenseRow = (index: number) => {
    if (subExpenseItems.length > 1) {
      const updated = subExpenseItems.filter((_, i) => i !== index);
      setSubExpenseItems(updated);
    }
  };

  const updateSubExpenseItem = (index: number, field: keyof SubExpenseItem, value: string) => {
    const updated = [...subExpenseItems];
    updated[index][field] = value;
    setSubExpenseItems(updated);
  };

  const handleSubmitSubExpenses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    const validItems = subExpenseItems.filter(item => item.name && item.amount);
    if (validItems.length === 0) {
      alert('Please add at least one sub-expense with name and amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sub-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials:  'include',
        body: JSON. stringify({
          expense_id: selectedExpense.id,
          items: validItems. map(item => ({
            name: item.name,
            amount: parseFloat(item.amount),
            description: item.description,
          })),
        }),
      });
      const result = await response.json();

      if (result. success) {
        setIsSubExpenseModalOpen(false);
        setSelectedExpense(null);
        setSubExpenseItems([{ name: '', amount:  '', description: '' }]);
        fetchSubExpenses(selectedExpense.id);
      } else {
        alert(result. error || 'Failed to add sub-expenses');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubExpense = async (subExpenseId: number, expenseId: number) => {
    if (!confirm('Delete this sub-expense?')) return;
    try {
      // FIX:  Removed the space before 'id' in the URL
      const response = await fetch('/api/sub-expenses? id=' + subExpenseId, {
        method:  'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        fetchSubExpenses(expenseId);
      }
    } catch (err) {
      console.error('Delete sub-expense error:', err);
    }
  };

  const getSubExpenseTotal = (expenseId: number) => {
    const subs = subExpensesMap[expenseId] || [];
    return subs.reduce((sum, se) => sum + Number(se.amount), 0);
  };

  if (isLoading && expenses.length === 0) {
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
          <h1 className="text-2xl font-bold text-slate-900">Expense Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track expenses with breakdown support
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Add Expense
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by vendor, description, category, or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e. target.value)}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e. target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus: outline-none focus: ring-2 focus:ring-brandNavy/50"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Expenses</h3>
          <p className="text-xs text-slate-500 mt-1">Click on an expense to view/add breakdown</p>
        </div>

        {expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No expenses found
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {expenses.map((expense) => {
              const isExpanded = expandedExpenses.has(expense.id);
              const subExpenses = subExpensesMap[expense.id] || [];
              const subTotal = getSubExpenseTotal(expense.id);

              return (
                <div key={expense.id}>
                  <div
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleExpense(expense. id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg
                          className={'w-5 h-5 text-slate-400 transition-transform ' + (isExpanded ? 'rotate-90' : '')}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{expense.vendor}</p>
                            <Badge
                              variant={
                                expense.status === 'approved' ? 'success' : 
                                expense. status === 'rejected' ? 'danger' :  'warning'
                              }
                            >
                              {expense. status}
                            </Badge>
                            {subExpenses.length > 0 && (
                              <Badge variant="info">{subExpenses.length} items</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {expense.category_name} | {formatDate(expense.expense_date, 'dd MMM yyyy')}
                            {expense.description && ' | ' + expense. description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
                          {subExpenses.length > 0 && (
                            <p className="text-xs text-purple-600">Breakdown:  {formatCurrency(subTotal)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {canApprove && expense.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleApprove(expense)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openRejectModal(expense)}>
                                Reject
                              </Button>
                            </>
                          )}
                          {(expense.created_by === user?. id || user?.role === 'admin') && expense.status === 'pending' && (
                            <Button size="sm" variant="danger" onClick={() => handleDelete(expense)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50 p-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-slate-700">Expense Breakdown</h4>
                        <Button size="sm" onClick={() => openSubExpenseModal(expense)}>
                          + Add Breakdown
                        </Button>
                      </div>

                      {subExpenses.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No breakdown added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {subExpenses.map((se) => (
                            <div
                              key={se.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                            >
                              <div>
                                <p className="font-medium text-slate-900">{se.name}</p>
                                {se.description && <p className="text-xs text-slate-500">{se.description}</p>}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-semibold text-purple-700">
                                  {formatCurrency(Number(se.amount))}
                                </span>
                                <button
                                  onClick={() => handleDeleteSubExpense(se.id, expense.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end pt-2 border-t border-slate-200">
                            <p className="text-sm">
                              <span className="text-slate-500">Breakdown Total: </span>
                              <span className="font-semibold text-purple-700 ml-2">{formatCurrency(subTotal)}</span>
                              {subTotal !== expense.amount && (
                                <span className="text-xs text-amber-600 ml-2">
                                  (Difference: {formatCurrency(Math.abs(expense.amount - subTotal))})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {expense.rejection_reason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">
                            <span className="font-medium">Rejection Reason:  </span> {expense.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add New Expense" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e. target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus: outline-none focus: ring-2 focus:ring-brandNavy/50"
                required
              >
                <option value="">Select category</option>
                {categories. map((cat) => (
                  <option key={cat. id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target. value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
            <Input
              label="Vendor / Payee *"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e. target.value })}
              required
            />
            <Input
              label="Expense Date *"
              type="date"
              value={formData. expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e. target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Invoice Number"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number:  e.target.value })}
              placeholder="e.g., INV-2024-001"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target. value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
                placeholder="Describe the expense..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add Expense
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Expense" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Rejecting expense of <span className="font-semibold">{formatCurrency(selectedExpense?.amount || 0)}</span> from {selectedExpense?.vendor}
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
              placeholder="Enter reason for rejection..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              isLoading={isSubmitting}
              disabled={!rejectReason.trim()}
            >
              Reject Expense
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isSubExpenseModalOpen} onClose={() => setIsSubExpenseModalOpen(false)} title="Add Expense Breakdown" size="lg">
        <form onSubmit={handleSubmitSubExpenses} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700">
              Adding breakdown for:  <span className="font-semibold">{selectedExpense?.vendor}</span>
            </p>
            <p className="text-sm text-slate-500">
              Total Amount: <span className="font-semibold">{formatCurrency(selectedExpense?. amount || 0)}</span>
            </p>
          </div>

          <div className="space-y-3">
            {subExpenseItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <Input
                    placeholder="Item name (e.g., Refreshments)"
                    value={item.name}
                    onChange={(e) => updateSubExpenseItem(index, 'name', e.target. value)}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={item. amount}
                    onChange={(e) => updateSubExpenseItem(index, 'amount', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Description (optional)"
                    value={item.description}
                    onChange={(e) => updateSubExpenseItem(index, 'description', e.target. value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSubExpenseRow(index)}
                  className="p-2 text-red-500 hover:text-red-700"
                  disabled={subExpenseItems.length === 1}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-. 867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addSubExpenseRow} className="w-full">
            + Add Another Item
          </Button>

          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              Breakdown Total: <span className="font-semibold">
                {formatCurrency(
                  subExpenseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                )}
              </span>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsSubExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Breakdown
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}