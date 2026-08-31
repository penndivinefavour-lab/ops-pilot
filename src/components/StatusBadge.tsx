'use client';

import { useState } from 'react';

function Indicator({ status }: { status: 'healthy' | 'attention' | 'critical' }) {
  const color = status === 'critical' ? 'bg-ops-red' : status === 'attention' ? 'bg-ops-amber' : 'bg-ops-green';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

export default function StatusBadge({ status }: { status: 'healthy' | 'attention' | 'critical' }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ops-border bg-ops-surface text-sm">
      <Indicator status={status} />
      <span className="capitalize">{status}</span>
    </div>
  );
}
