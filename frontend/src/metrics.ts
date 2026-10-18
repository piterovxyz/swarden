export interface Metrics {
    cpu: {
        usage_percent: number;
    };
    mem: {
        total: number;
        available: number;
    };
}

export function subscribeToMetrics(
    onMetrics: (metrics: Metrics) => void,
    onError: () => void,
): () => void {
    const eventSource = new EventSource("/metrics");

    eventSource.onmessage = (event) => {
        try {
            onMetrics(JSON.parse(event.data) as Metrics);
        } catch {
            onError();
        }
    };

    eventSource.onerror = onError;

    return () => eventSource.close();
}
