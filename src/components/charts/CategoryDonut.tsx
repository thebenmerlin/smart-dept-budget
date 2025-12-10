'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#821910', '#243169', '#c94f3d', '#4f6999', '#d97706', '#059669'];

interface CategoryDonutProps {
  data: { category: string; total: number }[];
}

export default function CategoryDonut({ data }: CategoryDonutProps) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Category-wise Spending</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value:  number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center mt-2 pt-3 border-t border-slate-100">
        <span className="text-sm text-slate-500">Total: </span>
        <span className="text-lg font-bold text-brandNavy">₹{total. toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}