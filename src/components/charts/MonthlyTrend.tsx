'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MonthlyTrendProps {
  data: { month: string; total: number }[];
}

export default function MonthlyTrend({ data }:  MonthlyTrendProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Monthly Expense Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#243169" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#243169" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize:  12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
            contentStyle={{ borderRadius:  '8px', border: '1px solid #e2e8f0' }}
          />
          <Area type="monotone" dataKey="total" stroke="#243169" strokeWidth={2} fill="url(#colorTotal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}