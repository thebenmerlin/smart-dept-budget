'use client';
import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { mockCategories } from '../../data/mock';

interface ExpenseFormProps {
  onSubmit: (data: any) => void;
  onCancel:  () => void;
  initialData?: any;
}

export default function ExpenseForm({ onSubmit, onCancel, initialData }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    category: initialData?.categoryId || '',
    amount: initialData?.amount || '',
    vendor: initialData?.vendor || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    description: initialData?. description || '',
    event: initialData?.event || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target. value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus: ring-brandNavy/50"
            required
          >
            <option value="">Select category</option>
            {mockCategories. map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Amount (₹)"
          type="number"
          value={formData. amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
        <Input
          label="Vendor / Payee"
          value={formData.vendor}
          onChange={(e) => setFormData({ ...formData, vendor: e. target.value })}
          required
        />
        <Input
          label="Date"
          type="date"
          value={formData. date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      <Input
        label="Event / Activity (Optional)"
        value={formData.event}
        onChange={(e) => setFormData({ ...formData, event: e. target.value })}
        placeholder="e.g., Tech Fest 2024"
      />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
          placeholder="Describe the expense..."
        />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Expense</Button>
      </div>
    </form>
  );
}