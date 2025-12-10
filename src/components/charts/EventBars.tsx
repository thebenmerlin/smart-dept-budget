'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface EventBarsProps {
  data: { event: string; total: number }[];
}

export default function EventBars({ data }: EventBarsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Event-wise Spending</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <YAxis dataKey="event" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={120} />
          <Tooltip
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="total" fill="#821910" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}