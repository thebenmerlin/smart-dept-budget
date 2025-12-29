'use client';

import { useState, useEffect } from 'react';
import { useAuth, useRole } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import BreakdownModal from '@/components/ui/BreakdownModal';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ExpenseBreakdown {
  id?: number;
  name: string;
  amount: number | string;
  breakdown_date: string;
  payment_method: string;
}

interface ExpenseReceipt {
  id?: number;
  file_name: string;
  file_url: string;
  file_type?: string;
}

interface Budget {
  id: number;
  name: string;
  amount: number;
}

interface Expense {
  id: number;
  name: string;
  amount: number;
  budget_id: number | null;
  budget_name: string | null;
  budget_amount: number | null;
  budget_remaining: number | null;
  category_id: number | null;
  category_name: string | null;
  description: string | null;
  spender: string | null;
  payment_method: string;
  expense_date: string;
  status: string;
  rejection_reason: string | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
  breakdowns: ExpenseBreakdown[];
  receipts: ExpenseReceipt[];
}

interface Category {
  id: number;
  name: string;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { canApprove } = useRole();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    period: '',
    category_id: '',
    status: '',
    source: '',
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    budget_id: '',
    category_id: '',
    description: '',
    spender: '',
    payment_method: 'cash',
    expense_date: new Date().toISOString().split('T')[0],
  });

  const [breakdownItems, setBreakdownItems] = useState<ExpenseBreakdown[]>([
    { name: '', amount: '', breakdown_date: '', payment_method: 'cash' },
  ]);

  const [receiptItems, setReceiptItems] = useState<ExpenseReceipt[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      let url = '/api/expenses-new?';
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (filters.category_id) url += `category_id=${filters.category_id}&`;
      if (filters.status) url += `status=${filters.status}&`;
      if (filters.period) url += `period=${filters.period}&`;

      const response = await fetch(url, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setExpenses(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
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

  const fetchBudgets = async () => {
    try {
      const response = await fetch('/api/budgets-new', { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setBudgets(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchBudgets();
  }, [filters]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchExpenses();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      budget_id: '',
      category_id: '',
      description: '',
      spender: '',
      payment_method: 'cash',
      expense_date: new Date().toISOString().split('T')[0],
    });
    setBreakdownItems([{ name: '', amount: '', breakdown_date: '', payment_method: 'cash' }]);
    setReceiptItems([]);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openViewModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      budget_id: expense.budget_id?.toString() || '',
      category_id: expense.category_id?.toString() || '',
      description: expense.description || '',
      spender: expense.spender || '',
      payment_method: expense.payment_method,
      expense_date: expense.expense_date.split('T')[0],
    });
    setBreakdownItems(
      expense.breakdowns && expense.breakdowns.length > 0
        ? expense.breakdowns.map(b => ({
          ...b,
          amount: b.amount.toString(),
          breakdown_date: b.breakdown_date?.split('T')[0] || '',
        }))
        : [{ name: '', amount: '', breakdown_date: '', payment_method: 'cash' }]
    );
    setReceiptItems(expense.receipts || []);
    setIsEditMode(false);
    setIsViewModalOpen(true);
  };

  const getSelectedBudget = () => {
    if (!formData.budget_id) return null;
    return budgets.find(b => b.id === parseInt(formData.budget_id));
  };

  const getBudgetRemaining = () => {
    const budget = getSelectedBudget();
    if (!budget) return null;
    const expenseAmount = parseFloat(formData.amount) || 0;
    return budget.amount - expenseAmount;
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
        budget_id: formData.budget_id ? parseInt(formData.budget_id) : null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        breakdowns: validBreakdowns.map(b => ({
          name: b.name,
          amount: parseFloat(b.amount.toString()),
          breakdown_date: b.breakdown_date || null,
          payment_method: b.payment_method,
        })),
        receipts: receiptItems,
      };

      const response = await fetch('/api/expenses-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setIsAddModalOpen(false);
        resetForm();
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

  const handleUpdate = async () => {
    if (!selectedExpense || !formData.name || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const validBreakdowns = breakdownItems.filter(b => b.name && b.amount);
      const payload = {
        id: selectedExpense.id,
        ...formData,
        amount: parseFloat(formData.amount),
        budget_id: formData.budget_id ? parseInt(formData.budget_id) : null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        breakdowns: validBreakdowns.map(b => ({
          name: b.name,
          amount: parseFloat(b.amount.toString()),
          breakdown_date: b.breakdown_date || null,
          payment_method: b.payment_method,
        })),
      };

      const response = await fetch('/api/expenses-new', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setIsViewModalOpen(false);
        setIsEditMode(false);
        fetchExpenses();
      } else {
        alert(result.error || 'Failed to update expense');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (expense: Expense) => {
    try {
      const response = await fetch('/api/expenses-new', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: expense.id, status: 'approved' }),
      });
      const result = await response.json();
      if (result.success) {
        fetchExpenses();
        setIsViewModalOpen(false);
      }
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectReason.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/expenses-new', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: selectedExpense.id,
          status: 'rejected',
          rejection_reason: rejectReason,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setIsRejectModalOpen(false);
        setRejectReason('');
        setIsViewModalOpen(false);
        fetchExpenses();
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const response = await fetch(`/api/expenses-new?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setIsViewModalOpen(false);
        fetchExpenses();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const addBreakdownRow = () => {
    setBreakdownItems([...breakdownItems, { name: '', amount: '', breakdown_date: '', payment_method: 'cash' }]);
  };

  const removeBreakdownRow = (index: number) => {
    if (breakdownItems.length > 1) {
      setBreakdownItems(breakdownItems.filter((_, i) => i !== index));
    }
  };

  const updateBreakdownItem = (index: number, field: keyof ExpenseBreakdown, value: string) => {
    const updated = [...breakdownItems];
    (updated[index] as any)[field] = value;
    setBreakdownItems(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const uploadedReceipts: ExpenseReceipt[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`Invalid file type for ${file.name}. Allowed: PNG, JPEG, PDF`);
        continue;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds 10MB limit`);
        continue;
      }

      // Upload to Cloudinary via API
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.data) {
          uploadedReceipts.push({
            file_name: result.data.file_name,
            file_url: result.data.file_url,
            file_type: result.data.file_type,
          });
        } else {
          setUploadError(result.error || `Failed to upload ${file.name}`);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    setReceiptItems([...receiptItems, ...uploadedReceipts]);
    setIsUploading(false);

    // Reset the file input
    e.target.value = '';
  };

  const removeReceiptRow = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const breakdownTotal = breakdownItems.reduce((sum, item) => sum + (parseFloat(item.amount.toString()) || 0), 0);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'warning';
    }
  };

  const renderBreakdownForm = (readonly: boolean = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">Expense Breakdown</label>
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
          <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg flex-wrap">
            <Input
              placeholder="Name"
              value={item.name}
              onChange={(e) => updateBreakdownItem(index, 'name', e.target.value)}
              disabled={readonly}
              className="flex-1 min-w-[100px]"
            />
            <Input
              type="number"
              placeholder="Amount"
              value={item.amount}
              onChange={(e) => updateBreakdownItem(index, 'amount', e.target.value)}
              disabled={readonly}
              className="w-24"
            />
            <Input
              type="date"
              value={item.breakdown_date}
              onChange={(e) => updateBreakdownItem(index, 'breakdown_date', e.target.value)}
              disabled={readonly}
              className="w-32"
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
        title="Expense Breakdown"
        items={breakdownItems}
        onItemsChange={setBreakdownItems}
        readonly={readonly}
        type="expense"
      />
    </div>
  );

  const renderReceiptsForm = (readonly: boolean = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">Receipts</label>
      </div>

      {!readonly && (
        <div className="space-y-2">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-brandNavy transition-colors">
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="receipt-upload"
              disabled={isUploading}
            />
            <label htmlFor="receipt-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-slate-600">
                  {isUploading ? 'Uploading...' : 'Click to upload receipts'}
                </span>
                <span className="text-xs text-slate-400">PNG, JPEG, or PDF (max 10MB)</span>
              </div>
            </label>
          </div>
          {uploadError && (
            <p className="text-sm text-red-500">{uploadError}</p>
          )}
        </div>
      )}

      {receiptItems.length > 0 ? (
        <div className="space-y-2">
          {receiptItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
              <div className="flex-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-slate-700 truncate">{item.file_name}</span>
              </div>
              {item.file_url && (
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors flex-shrink-0"
                >
                  View
                </a>
              )}
              {!readonly && (
                <button type="button" onClick={() => removeReceiptRow(index)} className="p-1 text-red-500 hover:text-red-700 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">No receipts added</p>
      )}
    </div>
  );

  if (isLoading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandNavy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all expenses</p>
        </div>
        <Button onClick={openAddModal}>+ Add Expense</Button>
      </div>

      {/* Search and Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search expenses by name, description, category, or spender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6. 414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-. 707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md: grid-cols-4 gap-4 pt-4 border-t border-slate-200">
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
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
          </div>
        )}
      </div>

      {/* Expense List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No expenses found</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => openViewModal(expense)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{expense.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {expense.category_name && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{expense.category_name}</span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(expense.expense_date, 'dd MMM yyyy')}</span>
                      {expense.budget_name && (
                        <span className="text-xs text-blue-600">From:  {expense.budget_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(Number(expense.amount))}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(expense.status)}>
                      {expense.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-slate-700">Total Expenses</span>
          <span className="text-2xl font-bold text-red-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Expense" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
            <Input
              label="Expense Name *"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Against Budget</label>
              <select
                value={formData.budget_id}
                onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">No specific budget</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({formatCurrency(b.amount)})</option>
                ))}
              </select>
              {formData.budget_id && formData.amount && (
                <p className={`text-xs mt-1 ${getBudgetRemaining()! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Remaining from budget: {formatCurrency(getBudgetRemaining()!)}
                </p>
              )}
            </div>
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
          </div>

          <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            />
            <Input
              label="Spender"
              value={formData.spender}
              onChange={(e) => setFormData({ ...formData, spender: e.target.value })}
              placeholder="Who spent this?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Expense description..."
            />
          </div>

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

          {renderBreakdownForm(false)}
          {renderReceiptsForm(false)}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Add Expense</Button>
          </div>
        </form>
      </Modal>

      {/* View/Edit Expense Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setIsEditMode(false); }} title={isEditMode ? "Edit Expense" : "Expense Details"} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {!isEditMode ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{selectedExpense?.name}</h3>
                <Badge variant={getStatusBadgeVariant(selectedExpense?.status || 'pending')}>
                  {selectedExpense?.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Amount</label>
                  <p className="font-bold text-red-600 text-xl">{formatCurrency(Number(selectedExpense?.amount || 0))}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <p className="font-medium text-slate-900">{selectedExpense?.expense_date ? formatDate(selectedExpense.expense_date, 'dd MMM yyyy') : 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Category</label>
                  <p className="font-medium text-slate-900">{selectedExpense?.category_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Spender</label>
                  <p className="font-medium text-slate-900">{selectedExpense?.spender || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Description</label>
                <p className="font-medium text-slate-900">{selectedExpense?.description || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Payment Method</label>
                  <p className="font-medium text-slate-900 capitalize">{selectedExpense?.payment_method}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Against Budget</label>
                  <p className="font-medium text-slate-900">{selectedExpense?.budget_name || 'N/A'}</p>
                  {selectedExpense?.budget_name && (
                    <div className="mt-1 p-2 bg-slate-50 rounded-lg">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Budget:</span>
                        <span className="font-medium text-slate-700">{formatCurrency(Number(selectedExpense.budget_amount || 0))}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-slate-500">Remaining:</span>
                        <span className={`font-semibold ${(selectedExpense.budget_remaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Number(selectedExpense.budget_remaining || 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedExpense?.breakdowns && selectedExpense.breakdowns.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Breakdown</label>
                  <div className="space-y-2">
                    {selectedExpense.breakdowns.map((bd, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                        <div>
                          <span className="font-medium">{bd.name}</span>
                          {bd.breakdown_date && <span className="text-xs text-slate-500 ml-2">{formatDate(bd.breakdown_date, 'dd MMM')}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 capitalize">{bd.payment_method}</span>
                          <span className="font-semibold text-brandNavy">{formatCurrency(Number(bd.amount))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedExpense?.receipts && selectedExpense.receipts.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Receipts</label>
                  <div className="space-y-2">
                    {selectedExpense.receipts.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-medium text-slate-700">{r.file_name}</span>
                        </div>
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Receipt
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedExpense?.rejection_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <label className="text-xs text-red-600 font-medium">Rejection Reason</label>
                  <p className="text-sm text-red-700">{selectedExpense.rejection_reason}</p>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4 border-t">
                <div>
                  {(user?.role === 'admin' || selectedExpense?.created_by === user?.id) && selectedExpense?.status === 'pending' && (
                    <Button variant="danger" onClick={() => handleDelete(selectedExpense!.id)}>Delete</Button>
                  )}
                </div>
                <div className="flex gap-3">
                  {canApprove && selectedExpense?.status === 'pending' && (
                    <>
                      <Button variant="outline" onClick={() => handleApprove(selectedExpense!)}>Approve</Button>
                      <Button variant="danger" onClick={() => setIsRejectModalOpen(true)}>Reject</Button>
                    </>
                  )}
                  <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                  {selectedExpense?.status === 'pending' && (
                    <Button onClick={() => setIsEditMode(true)}>Edit</Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Expense Name *"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Against Budget</label>
                  <select
                    value={formData.budget_id}
                    onChange={(e) => setFormData({ ...formData, budget_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">No specific budget</option>
                    {budgets.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({formatCurrency(b.amount)})</option>
                    ))}
                  </select>
                </div>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
                <Input
                  label="Spender"
                  value={formData.spender}
                  onChange={(e) => setFormData({ ...formData, spender: e.target.value })}
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

              {renderBreakdownForm(false)}
              {renderReceiptsForm(false)}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsEditMode(false)}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>Save Changes</Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Expense" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Rejecting expense:  <span className="font-semibold">{selectedExpense?.name}</span>
          </p>
          <p className="text-sm text-slate-600">
            Amount: <span className="font-semibold text-red-600">{formatCurrency(selectedExpense?.amount || 0)}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Enter reason for rejection..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
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
    </div>
  );
}