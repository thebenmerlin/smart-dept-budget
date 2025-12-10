'use client';
import { useState } from 'react';

type Tab = { key: string; label: string };

export default function Tabs({ tabs, onChange }: { tabs: Tab[]; onChange?: (key: string) => void }) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div className="flex gap-2 border-b border-[var(--brand-border)] mb-4">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => {
              setActive(t.key);
              onChange?.(t.key);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              isActive
                ? 'bg-white border border-[var(--brand-border)] border-b-white text-brandNavy'
                : 'text-slate-600 hover:text-brandNavy'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}