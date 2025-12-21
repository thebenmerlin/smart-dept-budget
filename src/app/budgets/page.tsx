'use client';

import { useState, useEffect } from 'react';
import { useAuth, useRole } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatCurrency, getCurrentFiscalYear, getFiscalYearOptions } from '@/lib/utils';

interface SubBudgetItem {
  id: number;
  sub_budget_id: number;
  name: string;
  amount: number;
  description: string | null;
}

interface SubBudget {
  id:  number;
  category_id: number | null;
  name: string;
  description: string | null;
  amount: number;
  budget_type: string;
  status: string;
  category_name: string | null;
  created_by_name: string;
  created_at: string;
}

interface BudgetItem {
  category_id: number;
  category_name: string;
  category_description: string;
  proposed_amount: number;
  allotted_amount:  number;
  spent_amount: number;
  variance: number;
  remaining:  number;
  utilization: number;
  plan_status: string | null;
}

interface BudgetData {
  fiscalYear: string;
  budgets: BudgetItem[];
  totals: {
    proposed: number;
    allotted: number;
    spent:  number;
    variance: number;
    remaining: number;
    utilization: number;
  };
}

interface BreakdownItem {
  name: string;
  amount:  string;
  description:  string;
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const { canManageBudgets } = useRole();
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [data, setData] = useState<BudgetData | null>(null);
  const [subBudgets, setSubBudgets] = useState<SubBudget[]>([]);
  const [independentBudgets, setIndependentBudgets] = useState<SubBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedSubBudgets, setExpandedSubBudgets] = useState<Set<number>>(new Set());
  const [subBudgetItemsMap, setSubBudgetItemsMap] = useState<Record<number, SubBudgetItem[]>>({});

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAllotmentModalOpen, setIsAllotmentModalOpen] = useState(false);
  const [isSubBudgetModalOpen, setIsSubBudgetModalOpen] = useState(false);
  const [isIndependentBudgetModalOpen, setIsIndependentBudgetModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubBudget, setSelectedSubBudget] = useState<SubBudget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    notes: '',
    name: '',
    description: '',
  });

  const [breakdownItems, setBreakdownItems] = useState<BreakdownItem[]>([
    { name: '', amount: '', description:  '' },
  ]);

  const fetchBudgets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/budgets? fiscal_year=${fiscalYear}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch budgets');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubBudgets = async () => {
    try {
      const response = await fetch(`/api/sub-budgets?fiscal_year=${fiscalYear}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success && result. data) {
        const all = result.data as SubBudget[];
        setSubBudgets(all. filter(b => b.budget_type === 'category'));
        setIndependentBudgets(all.filter(b => b.budget_type === 'independent'));
      }
    } catch (err) {
      console.error('Failed to fetch sub-budgets:', err);
    }
  };

  const fetchSubBudgetItems = async (subBudgetId:  number) => {
    try {
      const response = await fetch(`/api/sub-budget-items? sub_budget_id=${subBudgetId}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success && result. data) {
        setSubBudgetItemsMap(prev => ({
          ...prev,
          [subBudgetId]:  result.data,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch sub-budget items:', err);
    }
  };

  const searchBudgets = async (query: string) => {
    if (!query.trim()) {
      fetchSubBudgets();
      return;
    }
    try {
      const response = await fetch(
        `/api/sub-budgets?fiscal_year=${fiscalYear}&search=${encodeURIComponent(query)}`,
        { credentials: 'include' }
      );
      const result = await response.json();
      if (result.success && result. data) {
        const all = result.data as SubBudget[];
        setSubBudgets(all. filter(b => b.budget_type === 'category'));
        setIndependentBudgets(all.filter(b => b.budget_type === 'independent'));
      }
    } catch (err) {
      console. error('Search error:', err);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchSubBudgets();
  }, [fiscalYear]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchBudgets(searchQuery);
      } else {
        fetchSubBudgets();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded. has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubBudget = (subBudgetId: number) => {
    const newExpanded = new Set(expandedSubBudgets);
    if (newExpanded.has(subBudgetId)) {
      newExpanded.delete(subBudgetId);
    } else {
      newExpanded. add(subBudgetId);
      if (! subBudgetItemsMap[subBudgetId]) {
        fetchSubBudgetItems(subBudgetId);
      }
    }
    setExpandedSubBudgets(newExpanded);
  };

  const getCategorySubBudgets = (categoryId: number) => {
    return subBudgets.filter(sb => sb.category_id === categoryId);
  };

  const getCategorySubBudgetTotal = (categoryId:  number) => {
    return getCategorySubBudgets(categoryId).reduce((sum, sb) => sum + Number(sb.amount), 0);
  };

  const getSubBudgetItemsTotal = (subBudgetId: number) => {
    const items = subBudgetItemsMap[subBudgetId] || [];
    return items.reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/budgets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategory,
          fiscal_year:  fiscalYear,
          proposed_amount: parseFloat(formData. amount),
          justification: formData. notes,
        }),
      });
      const result = await response.json();
      if (result. success) {
        setIsPlanModalOpen(false);
        setFormData({ amount: '', notes: '', name:  '', description: '' });
        fetchBudgets();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/budgets/allotments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:  JSON.stringify({
          category_id:  selectedCategory,
          fiscal_year: fiscalYear,
          allotted_amount:  parseFloat(formData.amount),
          notes: formData.notes,
        }),
      });
      const result = await response. json();
      if (result.success) {
        setIsAllotmentModalOpen(false);
        setFormData({ amount: '', notes: '', name: '', description:  '' });
        fetchBudgets();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSubBudget = async (e: React. FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !formData. name || !formData.amount) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sub-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:  JSON.stringify({
          category_id:  selectedCategory,
          fiscal_year: fiscalYear,
          name: formData.name,
          description: formData.description,
          amount:  parseFloat(formData.amount),
          budget_type: 'category',
        }),
      });
      const result = await response.json();
      if (result. success) {
        setIsSubBudgetModalOpen(false);
        setFormData({ amount: '', notes: '', name: '', description: '' });
        fetchSubBudgets();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitIndependentBudget = async (e:  React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || ! formData.amount) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sub-budgets', {
        method:  'POST',
        headers: { 'Content-Type':  'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fiscal_year: fiscalYear,
          name: formData.name,
          description:  formData.description,
          amount: parseFloat(formData. amount),
          budget_type: 'independent',
        }),
      });
      const result = await response.json();
      if (result.success) {
        setIsIndependentBudgetModalOpen(false);
        setFormData({ amount:  '', notes: '', name: '', description: '' });
        fetchSubBudgets();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubBudget = async (id: number) => {
    if (! confirm('Are you sure you want to delete this budget item?')) return;
    try {
      const response = await fetch(`/api/sub-budgets?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (result. success) {
        fetchSubBudgets();
      } else {
        console.error('Delete failed:', result.error);
        alert('Failed to delete:  ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error while deleting');
    }
  };

  const handleDeleteSubBudgetItem = async (itemId: number, subBudgetId: number) => {
    if (!confirm('Delete this breakdown item?')) return;
    try {
      const response = await fetch(`/api/sub-budget-items?id=${itemId}`, {
        method:  'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        fetchSubBudgetItems(subBudgetId);
      }
    } catch (err) {
      console.error('Delete sub-budget item error:', err);
    }
  };

  const openPlanModal = (categoryId: number) => {
    const budget = data?.budgets. find(b => b.category_id === categoryId);
    setSelectedCategory(categoryId);
    setFormData({
      amount: budget?.proposed_amount?. toString() || '',
      notes: '',
      name: '',
      description: '',
    });
    setIsPlanModalOpen(true);
  };

  const openAllotmentModal = (categoryId: number) => {
    const budget = data?. budgets.find(b => b.category_id === categoryId);
    setSelectedCategory(categoryId);
    setFormData({
      amount:  budget?.allotted_amount?.toString() || '',
      notes: '',
      name: '',
      description: '',
    });
    setIsAllotmentModalOpen(true);
  };

  const openSubBudgetModal = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setFormData({ amount: '', notes:  '', name: '', description: '' });
    setIsSubBudgetModalOpen(true);
  };

  const openBreakdownModal = (subBudget: SubBudget) => {
    setSelectedSubBudget(subBudget);
    setBreakdownItems([{ name: '', amount:  '', description: '' }]);
    setIsBreakdownModalOpen(true);
  };

  const addBreakdownRow = () => {
    setBreakdownItems([...breakdownItems, { name: '', amount: '', description: '' }]);
  };

  const removeBreakdownRow = (index: number) => {
    if (breakdownItems. length > 1) {
      setBreakdownItems(breakdownItems.filter((_, i) => i !== index));
    }
  };

  const updateBreakdownItem = (index: number, field: keyof BreakdownItem, value: string) => {
    const updated = [...breakdownItems];
    updated[index][field] = value;
    setBreakdownItems(updated);
  };

  const handleSubmitBreakdown = async (e:  React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubBudget) return;

    const validItems = breakdownItems. filter(item => item.name && item. amount);
    if (validItems.length === 0) {
      alert('Please add at least one breakdown item with name and amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sub-budget-items', {
        method:  'POST',
        headers: { 'Content-Type':  'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sub_budget_id: selectedSubBudget.id,
          items: validItems. map(item => ({
            name: item.name,
            amount: parseFloat(item.amount),
            description:  item.description,
          })),
        }),
      });
      const result = await response.json();

      if (result. success) {
        setIsBreakdownModalOpen(false);
        setSelectedSubBudget(null);
        setBreakdownItems([{ name: '', amount:  '', description: '' }]);
        fetchSubBudgetItems(selectedSubBudget.id);
      } else {
        alert(result.error || 'Failed to add breakdown');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brandNavy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totals = data?.totals;
  const independentTotal = independentBudgets. reduce((sum, b) => sum + Number(b.amount), 0);
  const subBudgetTotal = subBudgets.reduce((sum, b) => sum + Number(b.amount), 0);

  const renderSubBudgetCard = (sb: SubBudget) => {
    const isExpanded = expandedSubBudgets. has(sb.id);
    const items = subBudgetItemsMap[sb.id] || [];
    const itemsTotal = getSubBudgetItemsTotal(sb. id);

    return (
      <div key={sb.id} className="border border-slate-200 rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-3 bg-white cursor-pointer hover:bg-slate-50"
          onClick={() => toggleSubBudget(sb.id)}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div>
              <p className="font-medium text-slate-900">{sb.name}</p>
              {sb.description && <p className="text-xs text-slate-500">{sb.description}</p>}
              <p className="text-xs text-slate-400">Added by {sb.created_by_name}</p>
            </div>
            {items.length > 0 && (
              <Badge variant="info">{items.length} items</Badge>
            )}
          </div>
          <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-right">
              <span className="font-semibold text-purple-700">
                {formatCurrency(Number(sb.amount))}
              </span>
              {items.length > 0 && (
                <p className="text-xs text-purple-600">Breakdown:  {formatCurrency(itemsTotal)}</p>
              )}
            </div>
            <Badge
              variant={sb.status === 'active' ? 'success' : sb.status === 'completed' ? 'info' : 'danger'}
            >
              {sb.status}
            </Badge>
            {canManageBudgets && (
              <button
                onClick={() => handleDeleteSubBudget(sb.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="bg-purple-50 p-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-purple-800">Budget Breakdown</h5>
              {canManageBudgets && (
                <Button size="sm" variant="outline" onClick={() => openBreakdownModal(sb)}>
                  + Add Breakdown
                </Button>
              )}
            </div>

            {items.length === 0 ?  (
              <p className="text-sm text-slate-500 italic">No breakdown added yet</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-purple-100"
                  >
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      {item.description && <p className="text-xs text-slate-500">{item. description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-purple-700 text-sm">
                        {formatCurrency(Number(item.amount))}
                      </span>
                      {canManageBudgets && (
                        <button
                          onClick={() => handleDeleteSubBudgetItem(item.id, sb.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-purple-200">
                  <p className="text-sm">
                    <span className="text-slate-500">Breakdown Total: </span>
                    <span className="font-semibold text-purple-700 ml-2">{formatCurrency(itemsTotal)}</span>
                    {itemsTotal !== Number(sb.amount) && (
                      <span className="text-xs text-amber-600 ml-2">
                        (Difference: {formatCurrency(Math.abs(Number(sb.amount) - itemsTotal))})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Planning</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage category budgets and on-the-go budget items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target. value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus: ring-brandNavy/50"
          >
            {getFiscalYearOptions().map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
          {canManageBudgets && (
            <Button onClick={() => setIsIndependentBudgetModalOpen(true)}>
              + Independent Budget
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Input
          placeholder="Search budgets by name, description, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Proposed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totals?.proposed || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Allotted</p>
          <p className="text-2xl font-bold text-brandNavy mt-1">
            {formatCurrency(totals?.allotted || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">On-the-go (Categories)</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {formatCurrency(subBudgetTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Independent Budgets</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {formatCurrency(independentTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Spent</p>
          <p className="text-2xl font-bold text-brandPrimary mt-1">
            {formatCurrency(totals?.spent || 0)}
          </p>
        </div>
      </div>

      {independentBudgets. length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-orange-200 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-orange-900">Independent Budgets (Category-free)</h3>
              <p className="text-xs text-orange-700 mt-1">Click to expand and view/add breakdown</p>
            </div>
            <Badge variant="warning">{independentBudgets.length} items</Badge>
          </div>
          <div className="p-4 space-y-2">
            {independentBudgets. map((budget) => renderSubBudgetCard(budget))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Category-wise Budget Breakdown</h3>
          <p className="text-xs text-slate-500 mt-1">Click on a category to expand, then click on sub-budgets to view/add breakdown</p>
        </div>
        <div className="divide-y divide-slate-200">
          {data?.budgets.map((budget) => {
            const isExpanded = expandedCategories.has(budget.category_id);
            const categorySubBudgets = getCategorySubBudgets(budget.category_id);
            const subBudgetSum = getCategorySubBudgetTotal(budget.category_id);

            return (
              <div key={budget. category_id}>
                <div
                  className="p-4 hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggleCategory(budget.category_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' :  ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div>
                        <p className="font-medium text-slate-900">{budget.category_name}</p>
                        <p className="text-xs text-slate-500">{budget. category_description}</p>
                      </div>
                      {categorySubBudgets.length > 0 && (
                        <Badge variant="info">{categorySubBudgets.length} sub-items</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Proposed</p>
                        <p className="font-medium">{formatCurrency(budget.proposed_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Allotted</p>
                        <p className="font-medium text-brandNavy">{formatCurrency(budget.allotted_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">On-the-go</p>
                        <p className="font-medium text-purple-600">{formatCurrency(subBudgetSum)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Spent</p>
                        <p className="font-medium text-brandPrimary">{formatCurrency(budget.spent_amount)}</p>
                      </div>
                      <div className="w-24">
                        <ProgressBar value={budget. utilization} max={100} size="sm" showPercent={false} />
                        <p className="text-xs text-slate-500 text-center mt-1">{budget.utilization. toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-slate-700">On-the-go Budget Items</h4>
                      {canManageBudgets && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openPlanModal(budget. category_id)}>
                            Propose
                          </Button>
                          {(user?.role === 'admin' || user?. role === 'hod') && (
                            <Button size="sm" variant="secondary" onClick={() => openAllotmentModal(budget.category_id)}>
                              Allot
                            </Button>
                          )}
                          <Button size="sm" onClick={() => openSubBudgetModal(budget.category_id)}>
                            + Add Item
                          </Button>
                        </div>
                      )}
                    </div>

                    {categorySubBudgets.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No on-the-go budget items yet</p>
                    ) : (
                      <div className="space-y-2">
                        {categorySubBudgets.map((sb) => renderSubBudgetCard(sb))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Propose Budget" size="sm">
        <form onSubmit={handleSubmitPlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <p className="text-lg font-semibold text-slate-900">
              {data?.budgets.find(b => b. category_id === selectedCategory)?.category_name}
            </p>
          </div>
          <Input
            label="Proposed Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target. value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Justification</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e. target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus: outline-none focus: ring-2 focus:ring-brandNavy/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAllotmentModalOpen} onClose={() => setIsAllotmentModalOpen(false)} title="Allocate Budget" size="sm">
        <form onSubmit={handleSubmitAllotment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <p className="text-lg font-semibold text-slate-900">
              {data?.budgets. find(b => b.category_id === selectedCategory)?.category_name}
            </p>
          </div>
          <Input
            label="Allotted Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target. value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e. target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAllotmentModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="secondary" isLoading={isSubmitting}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSubBudgetModalOpen} onClose={() => setIsSubBudgetModalOpen(false)} title="Add On-the-go Budget Item" size="sm">
        <form onSubmit={handleSubmitSubBudget} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <p className="text-lg font-semibold text-slate-900">
              {data?.budgets.find(b => b.category_id === selectedCategory)?.category_name}
            </p>
          </div>
          <Input
            label="Item Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e. target.value })}
            placeholder="e.g., New Lab Equipment"
            required
          />
          <Input
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e. target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e. target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsSubBudgetModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Add Item</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isIndependentBudgetModalOpen} onClose={() => setIsIndependentBudgetModalOpen(false)} title="Add Independent Budget" size="sm">
        <form onSubmit={handleSubmitIndependentBudget} className="space-y-4">
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              Independent budgets are not tied to any category. Use these for special allocations. 
            </p>
          </div>
          <Input
            label="Budget Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e. target.value })}
            placeholder="e.g., Emergency Fund"
            required
          />
          <Input
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e. target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e. target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brandNavy/50"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsIndependentBudgetModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Add Budget</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isBreakdownModalOpen} onClose={() => setIsBreakdownModalOpen(false)} title="Add Budget Breakdown" size="lg">
        <form onSubmit={handleSubmitBreakdown} className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              Adding breakdown for:  <span className="font-semibold">{selectedSubBudget?. name}</span>
            </p>
            <p className="text-sm text-purple-600">
              Total Amount: <span className="font-semibold">{formatCurrency(selectedSubBudget?. amount || 0)}</span>
            </p>
          </div>

          <div className="space-y-3">
            {breakdownItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <Input
                    placeholder="Item name (e.g., Venue Booking)"
                    value={item.name}
                    onChange={(e) => updateBreakdownItem(index, 'name', e.target. value)}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={item. amount}
                    onChange={(e) => updateBreakdownItem(index, 'amount', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Description (optional)"
                    value={item.description}
                    onChange={(e) => updateBreakdownItem(index, 'description', e.target. value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBreakdownRow(index)}
                  className="p-2 text-red-500 hover:text-red-700"
                  disabled={breakdownItems.length === 1}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-. 867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addBreakdownRow} className="w-full">
            + Add Another Item
          </Button>

          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700">
              Breakdown Total: <span className="font-semibold">
                {formatCurrency(
                  breakdownItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                )}
              </span>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={() => setIsBreakdownModalOpen(false)}>
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