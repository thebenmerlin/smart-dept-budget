'use client';

import { useState, useEffect } from 'react';
import { useExpenses, ExpenseFilters } from '@/hooks/useExpenses';
import { useAuth, useRole } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Category {
  id:  number;
  name:  string;
  description: string;
}

interface Event {
  id:  number;
  name: string;
  event_type: string;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { canApprove } = useRole();
  const {
    expenses,
    isLoading,
    error,
    filters,
    setFilters,
    pagination,
    createExpense,
    approveExpense,
    rejectExpense,
    deleteExpense,
    uploadReceipt,
    isUploading,
    refresh,
  } = useExpenses();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    category_id: '',
    event_id: '',
    amount: '',
    vendor: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    invoice_number: '',
  });

  const categoriesApi = useApi<Category[]>();
  const eventsApi = useApi<Event[]>();

  useEffect(() => {
    categoriesApi.get('/api/categories').then((result) => {
      if (result.success && result.data) {
        setCategories(result.data);
      }
    });
    eventsApi.get('/api/events').then((result) => {
      if (result.success && result. data) {
        setEvents(result. data);
      }
    });
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await createExpense({
      category_id: parseInt(formData.category_id),
      event_id: formData.event_id ?  parseInt(formData. event_id) : null,
      amount: parseFloat(formData.amount),
      vendor: formData.vendor,
      expense_date: formData.expense_date,
      description: formData.description,
      invoice_number:  formData.invoice_number,
    });

    setIsSubmitting(false);

    if (result. success) {
      setIsCreateModalOpen(false);
      setFormData({
        category_id: '',
        event_id:  '',
        amount:  '',
        vendor:  '',
        expense_date: new Date().toISOString().split('T')[0],
        description:  '',
        invoice_number: '',
      });
    }
  };

  const handleApprove = async (expense: any) => {
    await approveExpense(expense.id);
  };

  const handleReject = async () => {
    if (! selectedExpense || ! rejectReason. trim()) return;

    setIsSubmitting(true);
    await rejectExpense(selectedExpense.id, rejectReason);
    setIsSubmitting(false);
    setIsRejectModalOpen(false);
    setRejectReason('');
    setSelectedExpense(null);
  };

  const handleUploadReceipt = async () => {
    if (!selectedExpense || !receiptFile) return;

    setIsSubmitting(true);
    await uploadReceipt(selectedExpense.id, receiptFile);
    setIsSubmitting(false);
    setIsReceiptModalOpen(false);
    setReceiptFile(null);
    setSelectedExpense(null);
  };

  const handleDelete = async (expense: any) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense(expense.id);
    }
  };

  const openRejectModal = (expense: any) => {
    setSelectedExpense(expense);
    setIsRejectModalOpen(true);
  };

  const openReceiptModal = (expense: any) => {
    setSelectedExpense(expense);
    setIsReceiptModalOpen(true);
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
            Track and manage department expenses
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Add Expense
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            placeholder="Search by vendor..."
            value={filters.vendor || ''}
            onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
          />
          <select
            value={filters.category_id || ''}
            onChange={(e) => setFilters({ ...filters, category_id:  e.target.value ?  parseInt(e.target.value) : undefined })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
          >
            <option value="">All Categories</option>
            {categories. map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ... filters, status: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus: outline-none focus: ring-2 focus:ring-brandNavy/50"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => setFilters({ ...filters, date_from:  e.target.value })}
            placeholder="From date"
          />
          <Input
            type="date"
            value={filters. date_to || ''}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            placeholder="To date"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
          columns={[
            {
              key: 'expense_date',
              header: 'Date',
              render:  (row) => formatDate(row.expense_date, 'dd MMM yyyy'),
            },
            {
              key: 'category_name',
              header: 'Category',
              render: (row) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                  {row.category_name}
                </span>
              ),
            },
            {
              key: 'description',
              header:  'Description',
              className: 'max-w-xs',
              render: (row) => (
                <div>
                  <p className="truncate">{row. description || '-'}</p>
                  {row.invoice_number && (
                    <p className="text-xs text-slate-400">Inv:  {row.invoice_number}</p>
                  )}
                </div>
              ),
            },
            { key: 'vendor', header: 'Vendor' },
            {
              key: 'amount',
              header: 'Amount',
              render: (row) => (
                <span className="font-semibold text-slate-900">
                  {formatCurrency(row. amount)}
                </span>
              ),
            },
            {
              key:  'status',
              header: 'Status',
              render: (row) => (
                <Badge
                  variant={
                    row. status === 'approved' ? 'success' :
                    row.status === 'rejected' ? 'danger' : 'warning'
                  }
                >
                  {row.status}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-1">
                  {canApprove && row.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleApprove(row)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openRejectModal(row)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {(row.created_by === user?. id || user?.role === 'admin') && row.status === 'pending' && (
                    <Button size="sm" variant="danger" onClick={() => handleDelete(row)}>
                      Delete
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={expenses}
          emptyMessage="No expenses found"
        />
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Expense"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id:  e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e. target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Event (Optional)</label>
              <select
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id:  e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
              >
                <option value="">No event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Invoice Number"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ... formData, invoice_number: e.target.value })}
              placeholder="e.g., INV-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target. value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
              placeholder="Describe the expense..."
            />
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

      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Expense"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please provide a reason for rejecting this expense of{' '}
            <span className="font-semibold">{formatCurrency(selectedExpense?.amount || 0)}</span>
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

      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Upload Receipt"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Upload receipt for expense:  <span className="font-semibold">{selectedExpense?.description || selectedExpense?.vendor}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Receipt File</label>
            <input
              type="file"
              accept=".pdf,. png,.jpg,.jpeg"
              onChange={(e) => setReceiptFile(e. target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
            />
            <p className="text-xs text-slate-500 mt-1">PDF, PNG, or JPEG (max 10MB)</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="ghost" onClick={() => setIsReceiptModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadReceipt}
              isLoading={isSubmitting || isUploading}
              disabled={!receiptFile}
            >
              Upload Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}