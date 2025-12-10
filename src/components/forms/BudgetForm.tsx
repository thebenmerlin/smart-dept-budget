'use client';
import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface BudgetFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export default function BudgetForm({ onSubmit, onCancel, initialData }: BudgetFormProps) {
  const [formData, setFormData] = useState({
    fiscalYear: initialData?.fiscalYear || '2024-25',
    proposedAmount: initialData?.proposedAmount || '',
    allottedAmount: initialData?.allottedAmount || '',
    notes: initialData?.notes || '',
  });

  const variance = Number(formData.allottedAmount || 0) - Number(formData.proposedAmount || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e. preventDefault();
    onSubmit({ ...formData, variance });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fiscal Year</label>
        <select
          value={formData. fiscalYear}
          onChange={(e) => setFormData({ ...formData, fiscalYear: e. target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus: outline-none focus: ring-2 focus:ring-brandNavy/50"
        >
          <option value="2024-25">2024-25</option>
          <option value="2025-26">2025-26</option>
          <option value="2023-24">2023-24</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
        <Input
          label="Proposed Amount (₹)"
          type="number"
          value={formData.proposedAmount}
          onChange={(e) => setFormData({ ...formData, proposedAmount: e.target. value })}
          required
        />
        <Input
          label="Allotted Amount (₹)"
          type="number"
          value={formData. allottedAmount}
          onChange={(e) => setFormData({ ...formData, allottedAmount:  e.target.value })}
          required
        />
      </div>
      {formData.proposedAmount && formData.allottedAmount && (
        <div className={`p-3 rounded-lg ${variance >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <span className="text-sm font-medium">
            Variance:  {variance >= 0 ? '+' : ''}₹{variance.toLocaleString('en-IN')}
          </span>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ... formData, notes:  e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
          placeholder="Additional notes..."
        />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Budget</Button>
      </div>
    </form>
  );
}