'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import Dashboard from '../components/Dashboard';
import { useOperationsSnapshot, OperationsSnapshot } from '../components/useOperationsSnapshot';

export default function Page() {
  const [ready, setReady] = useState(false);
  const snapshot = useOperationsSnapshot();

  useEffect(() => {
    if (snapshot) setReady(true);
  }, [snapshot]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 px-6 py-6">
          {!ready ? (
            <div className="flex items-center justify-center h-64 text-ops-muted text-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-ops-accent border-t-transparent rounded-full animate-spin" />
                <span>Loading operations data...</span>
              </div>
            </div>
          ) : snapshot ? (
            <Dashboard snapshot={snapshot} />
          ) : (
            <div className="flex items-center justify-center h-64 text-ops-muted text-sm">
              Unable to load operations data.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
