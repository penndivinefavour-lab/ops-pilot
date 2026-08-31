'use client';

import { useEffect, useState } from 'react';

export interface OperationsSnapshot {
  overallStatus: 'healthy' | 'attention' | 'critical';
  projects: { total: number; byStatus: Record<string, number> };
  tasks: { total: number; open: number; overdue: number; blocked: number };
  incidents: { total: number; open: number; critical: number };
  approvals: { pending: number };
  recentActivity: Array<{
    id: number;
    actorType: string;
    actorName: string;
    eventType: string;
    description: string;
    createdAt: string;
  }>;
}

export function useOperationsSnapshot(): OperationsSnapshot | null {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);

  useEffect(() => {
    fetch('/api/operations')
      .then((r) => r.json())
      .then((data) => setSnapshot(data.snapshot))
      .catch(() => {});
  }, []);

  return snapshot;
}
