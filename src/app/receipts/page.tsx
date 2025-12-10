'use client';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ReceiptUpload from '../../components/forms/ReceiptUpload';
import { mockReceipts, mockExpenses } from '../../data/mock';

export default function ReceiptsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receipts, setReceipts] = useState(mockReceipts);

  const handleUpload = (file: File) => {
    const newReceipt = {
      id: receipts.length + 1,
      expenseId: 1,
      filename: file.name,
      url: `/receipts/${file. name}`,
      uploadedAt: new Date().toISOString().split('T')[0],
      size: `${(file.size / 1024).toFixed(1)} KB`,
    };
    setReceipts([newReceipt, ...receipts]);
    setIsModalOpen(false);
  };

  const getExpenseDetails = (expenseId: number) => {
    return mockExpenses.find((e) => e.id === expenseId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receipt Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and manage expense receipts for verification
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Receipt
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Receipts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{receipts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Verified</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{receipts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Verification</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">0</p>
        </div>
      </div>

      {/* Receipts Grid */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">All Receipts</h3>
        </div>
        <Table
          columns={[
            {
              key: 'filename',
              header: 'File',
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brandNavy/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brandNavy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{row.filename}</p>
                    <p className="text-xs text-slate-500">{row.size}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'expense',
              header: 'Related Expense',
              render: (row) => {
                const expense = getExpenseDetails(row.expenseId);
                return expense ? (
                  <div>
                    <p className="text-sm text-slate-900">{expense.description. slice(0, 40)}...</p>
                    <p className="text-xs text-slate-500">₹{expense.amount.toLocaleString('en-IN')}</p>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                );
              },
            },
            { key: 'uploadedAt', header:  'Uploaded' },
            {
              key: 'actions',
              header: 'Actions',
              render:  () => (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">View</Button>
                  <Button size="sm" variant="ghost">Download</Button>
                </div>
              ),
            },
          ]}
          data={receipts}
        />
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Receipt" size="md">
        <ReceiptUpload onUpload={handleUpload} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}