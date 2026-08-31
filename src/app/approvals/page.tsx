'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import TopNav from '../../components/TopNav';

interface ApprovalRecord {
  id: number;
  actionType: string;
  targetType: string;
  targetId: number;
  reason: string;
  expectedImpact: string;
  risk: string;
  agentRecommendation: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  target?: { id: number; title: string; status: string; type: string } | null;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/approvals')
      .then((r) => r.json())
      .then((data) => {
        setApprovals(data.approvals ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApprove = async (id: number) => {
    setProcessing(id);
    setActionResult(null);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _method: 'approve', id }),
      });
      const data = await res.json();
      if (data.approval) {
        setApprovals((prev) => prev.map((a) => (a.id === id ? data.approval : a)));
        setActionResult({ success: true, message: 'Approval granted. The agent can now execute.' });
      } else {
        setActionResult({ success: false, message: data.error ?? 'Failed to approve.' });
      }
    } catch {
      setActionResult({ success: false, message: 'Network error.' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessing(id);
    setActionResult(null);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _method: 'reject', id }),
      });
      const data = await res.json();
      if (data.approval) {
        setApprovals((prev) => prev.map((a) => (a.id === id ? data.approval : a)));
        setActionResult({ success: true, message: 'Action rejected.' });
      } else {
        setActionResult({ success: false, message: data.error ?? 'Failed to reject.' });
      }
    } catch {
      setActionResult({ success: false, message: 'Network error.' });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 px-6 py-6 flex items-center justify-center">
            <div className="text-ops-muted text-sm">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 px-6 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Approvals</h1>
            <p className="text-ops-muted text-sm mt-0.5">Agent actions awaiting human authorization</p>
          </div>

          {actionResult && (
            <div className={`mb-4 px-4 py-3 rounded-lg border ${actionResult.success ? 'bg-ops-green/10 border-ops-green text-ops-green' : 'bg-ops-red/10 border-ops-red text-ops-red'}`}>
              {actionResult.message}
            </div>
          )}

          {approvals.length === 0 && (
            <div className="text-ops-muted text-sm text-center py-12 border border-ops-border rounded-lg bg-ops-surface">
              No pending approvals. The agent can proceed without waiting.
            </div>
          )}

          <div className="space-y-4">
            {approvals.map((a) => (
              <ApprovalCard
                key={a.id}
                approval={a}
                processing={processing}
                onApprove={() => handleApprove(a.id)}
                onReject={() => handleReject(a.id)}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function ApprovalCard({ approval, processing, onApprove, onReject }: {
  approval: ApprovalRecord;
  processing: number | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = approval.status === 'pending';
  const canAct = isPending && processing !== approval.id;

  return (
    <div className={`rounded-lg border ${isPending ? 'border-ops-amber/40 bg-ops-amber/5' : 'border-ops-border bg-ops-surface'} p-5`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium capitalize">{approval.actionType.replace(/_/g, ' ')}</span>
            <span className="text-xs text-ops-muted bg-ops-surfaceRaised px-2 py-0.5 rounded">{approval.targetType} #{approval.targetId}</span>
            <StatusChip status={approval.status} />
          </div>
          <p className="text-xs text-ops-muted mt-0.5">Created {new Date(approval.createdAt).toLocaleString()}</p>
        </div>
        <RiskBadge risk={approval.risk} />
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Reason</span>
          <p className="text-ops-foreground mt-0.5">{approval.reason}</p>
        </div>
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Expected Impact</span>
          <p className="text-ops-foreground mt-0.5">{approval.expectedImpact}</p>
        </div>
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Agent Recommendation</span>
          <p className="text-ops-foreground mt-0.5 italic">{approval.agentRecommendation}</p>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-ops-border">
          <button
            onClick={onReject}
            disabled={!canAct}
            className="px-4 py-2 rounded-lg border border-ops-border bg-ops-surface text-sm text-ops-foreground disabled:opacity-40 hover:bg-ops-surfaceRaised transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            disabled={!canAct}
            className="px-4 py-2 rounded-lg bg-ops-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-ops-accent/90 transition-colors"
          >
            {processing === approval.id ? 'Processing...' : 'Approve'}
          </button>
        </div>
      )}

      {!isPending && (
        <div className={`mt-3 pt-3 border-t border-ops-border text-sm ${approval.status === 'executed' ? 'text-ops-green' : approval.status === 'rejected' ? 'text-ops-red' : 'text-ops-muted'}`}>
          Status: {approval.status}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-ops-amber text-ops-foreground',
    approved: 'bg-ops-green text-white',
    rejected: 'bg-ops-red text-white',
    executed: 'bg-ops-purple text-white',
    failed: 'bg-ops-red text-white',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-ops-muted'}`}>
      {status}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    low: 'bg-ops-green text-white',
    medium: 'bg-ops-amber text-ops-foreground',
    high: 'bg-ops-red text-white',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors[risk] ?? 'bg-ops-muted'} uppercase`}>
      {risk} risk
    </span>
  );
}
