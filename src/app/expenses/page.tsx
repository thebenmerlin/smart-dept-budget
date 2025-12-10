'use client';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import ExpenseForm from '../../components/forms/ExpenseForm';
import { mockExpenses, mockCategories } from '../../data/mock';

export default function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState(mockExpenses);
  const [filters, setFilters] = useState({ category: '', status: '', search: '' });

  const filteredExpenses = expenses.filter((exp) => {
    if (filters.category && exp.category !== filters.category) return false;
    if (filters.status && exp.status !== filters. status) return false;
    if (filters.search && ! exp.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = (data: any) => {
    const category = mockCategories.find((c) => c.id === Number(data.category));
    const newExpense = {
      id: expenses.length + 1,
      category: category?. name || 'Unknown',
      categoryId: Number(data.category),
      amount: Number(data. amount),
      vendor: data.vendor,
      date: data.date,
      description: data.description,
      status: 'pending',
      event: data.event || null,
      receiptUrl: null,
    };
    setExpenses([newExpense, ...expenses]);
    setIsModalOpen(false);
  };

  const handleApprove = (id: number) => {
    setExpenses(expenses.map((e) => (e.id === id ? { ...e, status: 'approved' } : e)));
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage all department expenses
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search expenses..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target. value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
          >
            <option value="">All Categories</option>
            {mockCategories. map((cat) => (
              <option key={cat.id} value={cat. name}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ... filters, status: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-500">Total: </span>
            <span className="font-semibold text-brandNavy">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
          columns={[
            { key:  'date', header: 'Date' },
            {
              key: 'category',
              header: 'Category',
              render:  (row) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                  {row.category}
                </span>
              ),
            },
            { key: 'description', header: 'Description', className: 'max-w-xs' },
            { key: 'vendor', header: 'Vendor' },
            {
              key: 'event',
              header:  'Event',
              render: (row) => row.event || <span className="text-slate-400">—</span>,
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (row) => (
                <span className="font-semibold text-slate-900">₹{row. amount.toLocaleString('en-IN')}</span>
              ),
            },
            {
              key: 'status',
              header:  'Status',
              render: (row) => (
                <Badge variant={row.status === 'approved' ? 'success' : row. status === 'rejected' ? 'danger' : 'warning'}>
                  {row.status}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render:  (row) =>
                row.status === 'pending' ? (
                  <Button size="sm" variant="outline" onClick={() => handleApprove(row.id)}>
                    Approve
                  </Button>
                ) : (
                  <span className="text-slate-400 text-sm">—</span>
                ),
            },
          ]}
          data={filteredExpenses}
          emptyMessage="No expenses found matching your filters"
        />
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Expense" size="lg">
        <ExpenseForm onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}