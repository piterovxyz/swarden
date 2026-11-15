import type { SystemMetrics } from '@swarden/shared';
import { useEffect, useState } from 'react';

const KIB_PER_GIB = 1024 * 1024;

export function App() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource('/sse');
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => setMetrics(JSON.parse(event.data));
    return () => source.close();
  }, []);

  const memUsed = metrics ? metrics.mem.total - metrics.mem.available : 0;
  const memPercent = metrics && metrics.mem.total > 0 ? (memUsed / metrics.mem.total) * 100 : 0;

  return (
    <main style={{ fontFamily: 'monospace', padding: 16 }}>
      <h1>swarden</h1>
      <p>{connected ? 'connected' : 'disconnected'}</p>
      {metrics ? (
        <>
          <p>
            CPU: {metrics.cpu.usage_percent.toFixed(1)}%
            <br />
            <progress value={metrics.cpu.usage_percent} max={100} />
          </p>
          <p>
            MEM: {memPercent.toFixed(1)}% ({(memUsed / KIB_PER_GIB).toFixed(2)} /{' '}
            {(metrics.mem.total / KIB_PER_GIB).toFixed(2)} GiB)
            <br />
            <progress value={memPercent} max={100} />
          </p>
        </>
      ) : (
        <p>waiting for data...</p>
      )}
    </main>
  );
}
