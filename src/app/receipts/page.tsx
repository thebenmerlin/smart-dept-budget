'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApi, useFileUpload } from '@/hooks/useApi';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Receipt {
  id: number;
  expense_id: number;
  filename: string;
  original_filename: string;
  cloudinary_url: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_name: string;
  created_at: string;
  expense_description: string;
  expense_amount: number;
  expense_vendor: string;
  category_name: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  vendor: string;
  status: string;
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const receiptsApi = useApi<Receipt[]>();
  const expensesApi = useApi();
  const { upload, isUploading, error:  uploadError } = useFileUpload();

  const fetchReceipts = async () => {
    const result = await receiptsApi.get('/api/receipts');
    if (result.success && result.data) {
      setReceipts(result.data);
    }
  };

  const fetchPendingExpenses = async () => {
    const result = await expensesApi. get('/api/expenses? status=pending');
    if (result. success && result.data?. expenses) {
      setPendingExpenses(result.data.expenses. filter((e:  any) => !e.receipts || e.receipts. length === 0));
    }
  };

  useEffect(() => {
    fetchReceipts();
    fetchPendingExpenses();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type. startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedExpenseId) return;

    const result = await upload('/api/receipts', selectedFile, {
      expense_id: selectedExpenseId,
    });

    if (result.success) {
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setSelectedExpenseId('');
      setPreviewUrl(null);
      fetchReceipts();
      fetchPendingExpenses();
    }
  };

  const handleDelete = async (receiptId: number) => {
    if (! confirm('Are you sure you want to delete this receipt?')) return;

    const result = await receiptsApi.delete(`/api/receipts/${receiptId}`);
    if (result.success) {
      fetchReceipts();
    }
  };

  const formatFileSize = (bytes:  number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h4v2h-4v-2zm0 3h4v2h-4v-2zm-2-3h1v5H8v-5z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receipt Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and manage expense receipts for verification and audit
          </p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          Upload Receipt
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Receipts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{receipts.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Expenses Without Receipts</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingExpenses.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Storage Used</p>
          <p className="text-2xl font-bold text-brandNavy mt-1">
            {formatFileSize(receipts.reduce((sum, r) => sum + (r.size_bytes || 0), 0))}
          </p>
        </div>
      </div>

      {pendingExpenses.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-semibold text-amber-900">Receipts Pending</h4>
              <p className="text-sm text-amber-700 mt-1">
                {pendingExpenses.length} expense(s) are missing receipts.  Upload receipts to complete the documentation.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">All Receipts</h3>
        </div>
        {receipts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No receipts uploaded yet</p>
            <p className="text-sm mt-1">Upload receipts to track expense documentation</p>
          </div>
        ) : (
          <Table
            columns={[
              {
                key: 'file',
                header: 'File',
                render: (row) => (
                  <div className="flex items-center gap-3">
                    {getFileIcon(row.mime_type)}
                    <div>
                      <p className="font-medium text-slate-900 truncate max-w-[200px]">
                        {row.original_filename}
                      </p>
                      <p className="text-xs text-slate-500">{formatFileSize(row.size_bytes)}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'expense',
                header: 'Related Expense',
                render: (row) => (
                  <div>
                    <p className="text-sm text-slate-900 truncate max-w-[200px]">
                      {row.expense_description || row.expense_vendor}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(row. expense_amount)} - {row.category_name}
                    </p>
                  </div>
                ),
              },
              {
                key: 'uploaded_by_name',
                header: 'Uploaded By',
              },
              {
                key: 'created_at',
                header: 'Upload Date',
                render: (row) => formatDate(row. created_at, 'dd MMM yyyy'),
              },
              {
                key:  'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <a
                      href={row.cloudinary_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brandNavy hover:underline text-sm"
                    >
                      View
                    </a>
                    <a
                      href={row.cloudinary_url}
                      download={row.original_filename}
                      className="text-brandNavy hover: underline text-sm"
                    >
                      Download
                    </a>
                    {(user?.role === 'admin' || user?. role === 'hod') && (
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            data={receipts}
          />
        )}
      </div>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedFile(null);
          setSelectedExpenseId('');
          setPreviewUrl(null);
        }}
        title="Upload Receipt"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Expense *
            </label>
            <select
              value={selectedExpenseId}
              onChange={(e) => setSelectedExpenseId(e.target. value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
              required
            >
              <option value="">Choose an expense... </option>
              {pendingExpenses.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {expense. vendor} - {formatCurrency(expense. amount)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Receipt File *
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                selectedFile ? 'border-brandNavy bg-brandNavy/5' : 'border-slate-300 hover:border-slate-400'
              }`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.png,.jpg,. jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ?  (
                <div className="flex items-center justify-center gap-4">
                  {previewUrl ?  (
                    <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  ) : (
                    getFileIcon(selectedFile.type)
                  )}
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, PNG, or JPEG (max 10MB)</p>
                </div>
              )}
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {uploadError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedFile(null);
                setSelectedExpenseId('');
                setPreviewUrl(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              isLoading={isUploading}
              disabled={! selectedFile || !selectedExpenseId}
            >
              Upload Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}