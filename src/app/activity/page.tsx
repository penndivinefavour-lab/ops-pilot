'use client';

import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import TopNav from '../../components/TopNav';

interface Proposal {
  blockers: Array<{ type: string; id: number; title: string; status: string; detail: string }>;
  recommendation: string;
  actionType: string;
  targetType: string;
  targetId: number | null;
}

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

interface ExecutedAction {
  actionId: number;
  approvalId: number;
  toolName: string;
  status: string;
  result: string;
}

interface Verification {
  verified: boolean;
  result: string;
}

export default function AgentPage() {
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [approval, setApproval] = useState<ApprovalRecord | null>(null);
  const [approved, setApproved] = useState(false);
  const [executed, setExecuted] = useState<ExecutedAction | null>(null);
  const [verified, setVerified] = useState<Verification | null>(null);
  const [activity, setActivity] = useState<Array<{ id: number; actorType: string; actorName: string; eventType: string; description: string; createdAt: string }>>([]);
  const [step, setStep] = useState<'propose' | 'approve' | 'execute' | 'verify'>('propose');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = () => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => {});
  };

  const loadActivity = () => {
    fetch('/api/activity')
      .then((r) => r.json())
      .then((data) => setActivity(data.events ?? []))
      .catch(() => {});
  };

  const runInvestigation = async (pid: number) => {
    setSubmitting(true);
    setMessage('');
    try {
      const snapshot = await fetch('/api/operations').then((r) => r.json());
      const blockers = await fetch(`/api/webmcp?tool=find_blockers&projectId=${pid}`).then((r) => r.json());
      const proposal = await fetch(`/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose', projectId: pid }),
      }).then((r) => r.json());

      const events = await fetch('/api/activity').then((r) => r.json());
      setActivity(events.events ?? []);

      setProposal(proposal.proposal);
      setProjectId(pid);
      setStep('approve');
      setMessage(`Investigation complete. Found ${blockers.blockers?.length ?? 0} blocker(s).`);
    } catch (err) {
      setMessage(`Investigation failed: ${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const submitApproval = async () => {
    if (!proposal) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_approval',
          actionType: proposal.actionType,
          targetType: proposal.targetType,
          targetId: proposal.targetId,
          reason: `Agent-identified blocker: ${proposal.blockers[0]?.title ?? 'unknown'}`,
          expectedImpact: proposal.recommendation,
          risk: 'low',
          agentRecommendation: proposal.recommendation,
        }),
      });
      const data = await res.json();
      if (data.approval) {
        setApproval(data.approval);
        const events = await fetch('/api/activity').then((r) => r.json());
        setActivity(events.events ?? []);
        setMessage(`Approval requested: #${data.approval.id}. The human must approve before execution.`);
      } else {
        setMessage('Failed to create approval: ' + (data.error ?? 'unknown'));
      }
    } catch (err) {
      setMessage('Approval request failed: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHumanApprove = async () => {
    if (!approval) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _method: 'approve', id: approval.id }),
      });
      const data = await res.json();
      if (data.approval) {
        setApproval(data.approval);
        setApproved(true);
        setStep('execute');
        const events = await fetch('/api/activity').then((r) => r.json());
        setActivity(events.events ?? []);
        setMessage('Human approved. The agent can now execute.');
      } else {
        setMessage('Approval failed: ' + (data.error ?? 'unknown'));
      }
    } catch (err) {
      setMessage('Approval failed: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHumanReject = async () => {
    if (!approval) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _method: 'reject', id: approval.id }),
      });
      const data = await res.json();
      if (data.approval) {
        setApproval(data.approval);
        setApproved(false);
        setMessage('Human rejected. Action will not be executed.');
        const events = await fetch('/api/activity').then((r) => r.json());
        setActivity(events.events ?? []);
      } else {
        setMessage('Rejection failed: ' + (data.error ?? 'unknown'));
      }
    } catch (err) {
      setMessage('Rejection failed: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const executeAction = async () => {
    if (!approval) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          approvalId: approval.id,
          toolName: approval.actionType,
          input: { assigneeId: 1 },
        }),
      });
      const data = await res.json();
      if (data.result) {
        setExecuted(data.result);
        setStep('verify');
        const events = await fetch('/api/activity').then((r) => r.json());
        setActivity(events.events ?? []);
        setMessage(`Executed: ${data.result.toolName}. Status: ${data.result.status}.`);
      } else {
        setMessage('Execution failed: ' + (data.error ?? 'unknown'));
      }
    } catch (err) {
      setMessage('Execution failed: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAction = async () => {
    if (!executed) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', actionId: executed.actionId }),
      });
      const data = await res.json();
      if (data.verification) {
        setVerified(data.verification);
        const events = await fetch('/api/activity').then((r) => r.json());
        setActivity(events.events ?? []);
        setMessage(`Verification: ${data.verification.result}`);
      } else {
        setMessage('Verification failed.');
      }
    } catch (err) {
      setMessage('Verification failed: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setProposal(null);
    setApproval(null);
    setApproved(false);
    setExecuted(null);
    setVerified(null);
    setStep('propose');
    setMessage('');
    setProjectId(undefined);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 px-6 py-6 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Agent Panel</h1>
            <p className="text-ops-muted text-sm mt-0.5">Human-agent collaboration workspace</p>
          </div>

          {message && (
            <div className="mb-4 px-4 py-3 rounded-lg border bg-ops-surface border-ops-border text-sm text-ops-foreground">
              {message}
            </div>
          )}

          <div className="space-y-4">
            {step === 'propose' && (
              <div>
                <h2 className="text-sm font-medium text-ops-muted uppercase tracking-wide mb-3">Investigation</h2>
                <div className="bg-ops-surface rounded-lg border border-ops-border p-5">
                  <p className="text-sm text-ops-foreground mb-4">
                    Select a project and ask the agent to investigate. The agent will use WebMCP tools to find blockers.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={projectId ?? ''}
                      onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                      className="bg-ops-surface border border-ops-border rounded-lg px-3 py-2 text-sm text-ops-foreground flex-1 min-w-[200px]"
                    >
                      <option value="">Select a project...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => projectId && runInvestigation(projectId)}
                      disabled={!projectId || submitting}
                      className="px-4 py-2 rounded-lg bg-ops-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-ops-accent/90 transition-colors"
                    >
                      {submitting ? 'Investigating...' : 'Investigate'}
                    </button>
                  </div>
                  <p className="text-xs text-ops-muted mt-3">This calls get_project, find_blockers, and propose_action_plan via WebMCP.</p>
                </div>

                {proposal && (
                  <div className="mt-4">
                    <h2 className="text-sm font-medium text-ops-muted uppercase tracking-wide mb-3">Current Proposal</h2>
                    <ProposalCard proposal={proposal} onSubmitApproval={submitApproval} />
                  </div>
                )}
              </div>
            )}

            {step === 'approve' && approval && (
              <div>
                <h2 className="text-sm font-medium text-ops-muted uppercase tracking-wide mb-3">Approval Required</h2>
                <ApprovalCard
                  approval={approval}
                  approved={approved}
                  onApprove={handleHumanApprove}
                  onReject={handleHumanReject}
                  disabled={submitting}
                />
                {approved && (
                  <button
                    onClick={executeAction}
                    disabled={submitting}
                    className="mt-4 px-4 py-2 rounded-lg bg-ops-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-ops-accent/90 transition-colors"
                  >
                    {submitting ? 'Executing...' : 'Execute Approved Action'}
                  </button>
                )}
              </div>
            )}

            {step === 'execute' && executed && (
              <div>
                <h2 className="text-sm font-medium text-ops-muted uppercase tracking-wide mb-3">Execution Result</h2>
                <div className="bg-ops-surface rounded-lg border border-ops-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${executed.status === 'completed' ? 'bg-ops-green text-white' : 'bg-ops-red text-white'}`}>
                      {executed.status}
                    </span>
                    <span className="text-sm text-ops-muted">Tool: {executed.toolName}</span>
                  </div>
                  <pre className="text-xs text-ops-muted bg-ops-surfaceRaised rounded p-3 overflow-x-auto">{executed.result}</pre>
                  <button
                    onClick={verifyAction}
                    disabled={submitting}
                    className="mt-4 px-4 py-2 rounded-lg bg-ops-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-ops-accent/90 transition-colors"
                  >
                    {submitting ? 'Verifying...' : 'Verify Action'}
                  </button>
                </div>
              </div>
            )}

            {step === 'verify' && verified && (
              <div>
                <h2 className="text-sm font-medium text-ops-muted uppercase tracking-wide mb-3">Verification</h2>
                <div className={`rounded-lg border p-5 ${verified.verified ? 'border-ops-green bg-ops-green/5' : 'border-ops-red bg-ops-red/5'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-medium ${verified.verified ? 'text-ops-green' : 'text-ops-red'}`}>
                      {verified.verified ? '✓ Verified' : '✗ Failed'}
                    </span>
                  </div>
                  <p className="text-sm text-ops-foreground">{verified.result}</p>
                </div>
                <button
                  onClick={reset}
                  className="mt-4 px-4 py-2 rounded-lg border border-ops-border text-sm text-ops-foreground hover:bg-ops-surfaceRaised transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-medium text-ops-muted uppercase tracking-wide mb-3">Activity Timeline</h2>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {activity.map((event) => (
                <div key={event.id} className="flex gap-3 p-2 border-b border-ops-border">
                  <span className="text-xs text-ops-muted w-20 shrink-0">
                    {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${event.actorType === 'human' ? 'bg-ops-accent/20 text-ops-accent' : event.actorType === 'agent' ? 'bg-ops-purple/20 text-ops-purple' : 'bg-ops-muted/20 text-ops-muted'}`}>
                    {event.actorType}
                  </span>
                  <span className="text-sm text-ops-foreground">{event.description}</span>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="text-ops-muted text-sm text-center py-4">No activity yet.</div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-ops-border">
            <h2 className="text-sm font-medium text-ops-muted uppercase tracking-wide mb-3">WebMCP Test Console</h2>
            <div className="bg-ops-surface rounded-lg border border-ops-border p-4">
              <p className="text-xs text-ops-muted mb-3">Test WebMCP tools directly. This is the same interface an external agent would use.</p>
              <WebMCPConsole onActivity={loadActivity} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, onSubmitApproval }: { proposal: Proposal; onSubmitApproval: () => void }) {
  const actionLabel = proposal.actionType.replace(/_/g, ' ');
  return (
    <div className="bg-ops-surface rounded-lg border border-ops-accent/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className="text-sm font-medium text-ops-accent">Agent Proposal</span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Action</span>
          <p className="text-ops-foreground font-medium">{actionLabel}</p>
        </div>
        {proposal.targetId && (
          <div>
            <span className="text-ops-muted text-xs uppercase tracking-wide">Target</span>
            <p className="text-ops-foreground">{proposal.targetType} #{proposal.targetId}</p>
          </div>
        )}
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Blockers Identified</span>
          <ul className="text-ops-foreground mt-1 list-disc list-inside space-y-0.5">
            {proposal.blockers.map((b) => (
              <li key={b.id}>#{b.id} {b.title} — {b.status}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Recommendation</span>
          <p className="text-ops-foreground mt-0.5">{proposal.recommendation}</p>
        </div>
      </div>
      <button
        onClick={onSubmitApproval}
        className="mt-4 w-full px-4 py-2 rounded-lg bg-ops-accent text-white text-sm font-medium hover:bg-ops-accent/90 transition-colors"
      >
        Request Approval
      </button>
    </div>
  );
}

function ApprovalCard({ approval, approved, onApprove, onReject, disabled }: {
  approval: ApprovalRecord;
  approved: boolean;
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 ${approved ? 'border-ops-green/40 bg-ops-green/5' : 'border-ops-amber/40 bg-ops-amber/5'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{approval.actionType.replace(/_/g, ' ')}</span>
          <span className="text-xs text-ops-muted bg-ops-surfaceRaised px-2 py-0.5 rounded">{approval.targetType} #{approval.targetId}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${approved ? 'bg-ops-green text-white' : 'bg-ops-amber text-ops-foreground'}`}>
            {approved ? 'Approved' : 'Pending'}
          </span>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${approval.risk === 'low' ? 'bg-ops-green text-white' : approval.risk === 'medium' ? 'bg-ops-amber text-ops-foreground' : 'bg-ops-red text-white'}`}>
          {approval.risk} risk
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Reason</span>
          <p className="text-ops-foreground">{approval.reason}</p>
        </div>
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Expected Impact</span>
          <p className="text-ops-foreground">{approval.expectedImpact}</p>
        </div>
        <div>
          <span className="text-ops-muted text-xs uppercase tracking-wide">Agent Recommendation</span>
          <p className="text-ops-foreground italic">{approval.agentRecommendation}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onReject}
          disabled={disabled || approved}
          className="px-4 py-2 rounded-lg border border-ops-border bg-ops-surface text-sm text-ops-foreground disabled:opacity-40 hover:bg-ops-surfaceRaised transition-colors"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          disabled={disabled || approved}
          className="px-4 py-2 rounded-lg bg-ops-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-ops-accent/90 transition-colors flex-1"
        >
          {approved ? 'Approved' : 'Approve'}
        </button>
      </div>
    </div>
  );
}

function WebMCPConsole({ onActivity }: { onActivity: () => void }) {
  const [selectedTool, setSelectedTool] = useState('get_operations_snapshot');
  const [body, setBody] = useState('{}');
  const [result, setResult] = useState<{ success: boolean; data?: unknown; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const tools = [
    'get_operations_snapshot',
    'search_tasks',
    'get_task',
    'create_task',
    'update_task',
    'assign_task',
    'search_incidents',
    'get_incident',
    'investigate_incident',
    'resolve_incident',
    'get_project',
    'analyze_project',
    'find_blockers',
    'propose_action_plan',
    'get_pending_approvals',
    'request_approval',
    'execute_approved_action',
    'verify_action',
  ];

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      let url = `/api/webmcp?tool=${selectedTool}`;
      let fetchMethod = 'GET';
      let fetchBody = undefined;

      try {
        const parsed = JSON.parse(body);
        if (selectedTool === 'create_task' || selectedTool === 'update_task' ||
            selectedTool === 'assign_task' || selectedTool === 'resolve_incident' ||
            selectedTool === 'request_approval' || selectedTool === 'execute_approved_action' ||
            selectedTool === 'verify_action' || selectedTool === 'propose_action_plan' ||
            selectedTool === 'get_task' || selectedTool === 'get_incident' ||
            selectedTool === 'investigate_incident' || selectedTool === 'get_project' ||
            selectedTool === 'analyze_project' || selectedTool === 'find_blockers' ||
            selectedTool === 'get_pending_approvals') {
          fetchMethod = 'POST';
          fetchBody = parsed;
          url = '/api/webmcp';
        }
      } catch {
        setResult({ success: false, error: 'Invalid JSON body' });
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        method: fetchMethod,
        headers: { 'Content-Type': 'application/json' },
        body: fetchBody ? JSON.stringify(fetchBody) : undefined,
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, data });
        onActivity();
      } else {
        setResult({ success: false, error: data.error ?? data.detail ?? 'Request failed', data });
      }
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <select
          value={selectedTool}
          onChange={(e) => setSelectedTool(e.target.value)}
          className="bg-ops-surface border border-ops-border rounded-lg px-3 py-2 text-sm text-ops-foreground flex-1"
        >
          {tools.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-ops-accent text-white text-sm font-medium disabled:opacity-40 hover:bg-ops-accent/90 transition-colors"
        >
          {loading ? 'Running...' : 'Invoke'}
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full bg-ops-surfaceRaised border border-ops-border rounded-lg p-3 text-xs font-mono text-ops-foreground placeholder:text-ops-muted mb-3 min-h-[80px] resize-y"
        placeholder='{"id": 1}'
      />
      {result && (
        <div className={`rounded-lg border p-3 ${result.success ? 'border-ops-green/40 bg-ops-green/5' : 'border-ops-red/40 bg-ops-red/5'}`}>
          <div className="text-xs font-medium mb-1">
            {result.success ? '✓ Tool executed successfully' : '✗ Error'}
          </div>
          <pre className="text-xs font-mono text-ops-muted whitespace-pre-wrap overflow-x-auto max-h-[200px]">
            {result.success ? JSON.stringify(result.data, null, 2) : (result.error ?? JSON.stringify(result.data))}
          </pre>
        </div>
      )}
    </div>
  );
}
