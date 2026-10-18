<script lang="ts">
    import { onMount } from "svelte";
    import "./App.css";
    import { subscribeToMetrics, type Metrics } from "./metrics";

    let metrics = $state<Metrics | null>(null);
    let error = $state(false);

    const memoryUnit = 1024 * 1024;
    let memoryUsed = $derived(
        metrics ? Math.max(metrics.mem.total - metrics.mem.available, 0) : 0,
    );
    let memoryTotal = $derived(
        metrics ? (metrics.mem.total / memoryUnit).toFixed(1) : "0",
    );
    let memoryPercent = $derived(
        metrics && metrics.mem.total > 0
            ? Math.min((memoryUsed / metrics.mem.total) * 100, 100)
            : 0,
    );
    let cpuPercent = $derived(
        metrics ? Math.min(Math.max(metrics.cpu.usage_percent, 0), 100) : 0,
    );

    onMount(() =>
        subscribeToMetrics(
            (value) => {
                metrics = value;
                error = false;
            },
            () => {
                error = true;
            },
        ),
    );
</script>

<svelte:head>
    <title>Swarden</title>
</svelte:head>

<main class="main-content">
    <div class="page-content">
        <header class="page-heading">
            <h1 class="brand">
                <span>Swarden</span>
            </h1>
        </header>

        {#if error}
            <div class="notice error-notice" role="status">
                <span class="notice-symbol">!</span>
                <span>Connection lost. Reconnecting…</span>
            </div>
        {:else if !metrics}
            <div class="notice loading-notice" role="status">
                <span class="loader"></span>
                <span>Connecting…</span>
            </div>
        {/if}

        <div class="metrics-grid">
            <article class="metric-card">
                <div class="card-topline">
                    <div class="metric-icon cpu-icon">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                            <path
                                d="M9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z"
                            />
                        </svg>
                    </div>
                    <span class="metric-label">CPU</span>
                </div>
                <div class="metric-value">
                    {metrics ? cpuPercent.toFixed(1) : "—"}{#if metrics}<span
                            >%</span
                        >{/if}
                </div>
                <div
                    class="progress-track"
                    title={metrics ? `${cpuPercent.toFixed(1)}%` : undefined}
                >
                    <div
                        class="progress-fill cpu-fill"
                        style={`width: ${metrics ? cpuPercent : 0}%`}
                    ></div>
                </div>
            </article>

            <article class="metric-card">
                <div class="card-topline">
                    <div class="metric-icon memory-icon">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="4" y="6" width="16" height="12" rx="2" />
                            <path
                                d="M8 10v4m4-4v4m4-4v4M8 3v3m4-3v3m4-3v3M8 18v3m4-3v3m4-3v3"
                            />
                        </svg>
                    </div>
                    <span class="metric-label">Memory</span>
                </div>
                <div class="metric-value">
                    {#if metrics}
                        {(memoryUsed / memoryUnit).toFixed(1)}<span
                            class="value-unit">/ {memoryTotal} GB</span
                        >
                    {:else}
                        —
                    {/if}
                </div>
                <div
                    class="progress-track"
                    title={metrics
                        ? `${memoryPercent.toFixed(1)}% used`
                        : undefined}
                >
                    <div
                        class="progress-fill memory-fill"
                        style={`width: ${metrics ? memoryPercent : 0}%`}
                    ></div>
                </div>
            </article>
        </div>
    </div>
</main>
