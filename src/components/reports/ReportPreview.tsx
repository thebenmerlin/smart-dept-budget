'use client';

import { formatCurrency, formatDate } from '@/lib/utils';

interface BudgetReportItem {
    id: number;
    budget_date: string;
    name: string;
    category_name: string | null;
    amount: number;
    source: string | null;
    payment_method: string;
    status: string;
}

interface ExpenseReportItem {
    id: number;
    expense_date: string;
    name: string;
    amount: number;
    budget_name: string | null;
    category_name: string | null;
    spender: string | null;
    payment_method: string;
    status: string;
}

interface ReportPreviewProps {
    type: 'budget' | 'expense';
    data: BudgetReportItem[] | ExpenseReportItem[];
    total: number;
    collegeName: string;
    departmentName: string;
    dateRange: string;
    isLoading?: boolean;
    onRowClick?: (item: BudgetReportItem | ExpenseReportItem) => void;
}

export default function ReportPreview({
    type,
    data,
    total,
    collegeName,
    departmentName,
    dateRange,
    isLoading = false,
    onRowClick,
}: ReportPreviewProps) {
    if (isLoading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brandNavy border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Letterhead */}
            <div className="bg-gradient-to-r from-brandNavy to-blue-800 text-white p-6">
                <div className="flex items-center gap-4">
                    <img
                        src="/logo.jpg"
                        alt="Logo"
                        className="w-16 h-16 rounded-lg object-cover bg-white p-1"
                    />
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">{collegeName}</h1>
                        <p className="text-blue-200">{departmentName}</p>
                    </div>
                </div>
            </div>

            {/* Report Title */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                    {type === 'budget' ? 'Budget Report' : 'Expense Report'}
                </h2>
                <p className="text-sm text-slate-500">Period: {dateRange}</p>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
                {data.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        No records found for the selected period
                    </div>
                ) : type === 'budget' ? (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Date</th>
                                <th className="px-4 py-3 text-left font-semibold">Name</th>
                                <th className="px-4 py-3 text-left font-semibold">Category</th>
                                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                                <th className="px-4 py-3 text-left font-semibold">Source</th>
                                <th className="px-4 py-3 text-center font-semibold">Payment</th>
                                <th className="px-4 py-3 text-center font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(data as BudgetReportItem[]).map((item, idx) => (
                                <tr
                                    key={item.id}
                                    className={`${idx % 2 === 1 ? 'bg-slate-50' : ''} ${onRowClick ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                                    onClick={() => onRowClick && onRowClick(item)}
                                >
                                    <td className="px-4 py-3 text-slate-600">
                                        {formatDate(item.budget_date, 'dd MMM yyyy')}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.category_name || '-'}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-brandNavy">
                                        {formatCurrency(Number(item.amount))}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{item.source || '-'}</td>
                                    <td className="px-4 py-3 text-center capitalize text-slate-500">{item.payment_method}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700' :
                                            item.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Date</th>
                                <th className="px-4 py-3 text-left font-semibold">Name</th>
                                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                                <th className="px-4 py-3 text-left font-semibold">Against Budget</th>
                                <th className="px-4 py-3 text-left font-semibold">Category</th>
                                <th className="px-4 py-3 text-left font-semibold">Spender</th>
                                <th className="px-4 py-3 text-center font-semibold">Payment</th>
                                <th className="px-4 py-3 text-center font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(data as ExpenseReportItem[]).map((item, idx) => (
                                <tr
                                    key={item.id}
                                    className={`${idx % 2 === 1 ? 'bg-slate-50' : ''} ${onRowClick ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                                    onClick={() => onRowClick && onRowClick(item)}
                                >
                                    <td className="px-4 py-3 text-slate-600">
                                        {formatDate(item.expense_date, 'dd MMM yyyy')}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-brandNavy">
                                        {formatCurrency(Number(item.amount))}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {item.budget_name || <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{item.category_name || '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.spender || '-'}</td>
                                    <td className="px-4 py-3 text-center capitalize text-slate-500">{item.payment_method}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer with Total */}
            {data.length > 0 && (
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm text-slate-500">{data.length} record(s)</span>
                    <div className="text-right">
                        <span className="text-sm text-slate-500 mr-2">Total:</span>
                        <span className="text-lg font-bold text-brandNavy">{formatCurrency(total)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
