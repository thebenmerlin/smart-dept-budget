'use client';
import { ReactNode, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import { formatCurrency } from '@/lib/utils';

interface BudgetBreakdownItem {
    id?: number;
    name: string;
    amount: number | string;
    payment_method: string;
}

interface ExpenseBreakdownItem {
    id?: number;
    name: string;
    amount: number | string;
    breakdown_date: string;
    payment_method: string;
}

type BreakdownItem = BudgetBreakdownItem | ExpenseBreakdownItem;

interface BreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    items: any[];
    onItemsChange: (items: any[]) => void;
    readonly?: boolean;
    type: 'budget' | 'expense';
}

export default function BreakdownModal({
    isOpen,
    onClose,
    title = 'Breakdown Details',
    items,
    onItemsChange,
    readonly = false,
    type,
}: BreakdownModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const addRow = () => {
        if (type === 'expense') {
            onItemsChange([...items, { name: '', amount: '', breakdown_date: '', payment_method: 'cash' }]);
        } else {
            onItemsChange([...items, { name: '', amount: '', payment_method: 'cash' }]);
        }
    };

    const removeRow = (index: number) => {
        if (items.length > 1) {
            onItemsChange(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: string, value: string) => {
        const updated = [...items];
        (updated[index] as any)[field] = value;
        onItemsChange(updated);
    };

    const total = items.reduce((sum, item) => sum + (parseFloat(item.amount.toString()) || 0), 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full mx-4 max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg flex-wrap">
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs text-slate-500 mb-1">Name</label>
                                <Input
                                    placeholder="Item name"
                                    value={item.name}
                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                    disabled={readonly}
                                />
                            </div>
                            <div className="w-28">
                                <label className="block text-xs text-slate-500 mb-1">Amount</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.amount}
                                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                                    disabled={readonly}
                                />
                            </div>
                            {type === 'expense' && (
                                <div className="w-36">
                                    <label className="block text-xs text-slate-500 mb-1">Date</label>
                                    <Input
                                        type="date"
                                        value={(item as ExpenseBreakdownItem).breakdown_date || ''}
                                        onChange={(e) => updateItem(index, 'breakdown_date', e.target.value)}
                                        disabled={readonly}
                                    />
                                </div>
                            )}
                            <div className="w-28">
                                <label className="block text-xs text-slate-500 mb-1">Payment</label>
                                <select
                                    value={item.payment_method}
                                    onChange={(e) => updateItem(index, 'payment_method', e.target.value)}
                                    disabled={readonly}
                                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="online">Online</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            {!readonly && items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeRow(index)}
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors self-end mb-1"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}

                    {!readonly && (
                        <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full">
                            + Add Breakdown Item
                        </Button>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            Total: <span className="font-bold text-lg text-brandNavy">{formatCurrency(total)}</span>
                        </div>
                        <Button onClick={onClose}>
                            {readonly ? 'Close' : 'Done'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
