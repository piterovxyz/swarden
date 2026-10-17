<script lang="ts">
    import { onMount } from "svelte";

    interface Metrics {
        cpu: {
            usage_percent: number;
        };
        mem: {
            total: number;
            available: number;
        };
    }

    let metrics = $state<Metrics | null>(null);
    let error = $state(false);

    onMount(() => {
        const eventSource = new EventSource("/metrics");

        eventSource.onmessage = (event) => {
            metrics = JSON.parse(event.data);
            error = false;
        };

        eventSource.onerror = () => {
            error = true;
        };

        return () => {
            eventSource.close();
        };
    });
</script>

<main>
    <h1>Swarden</h1>

    {#if error && !metrics}
        <p class="status error">error connect to backend</p>
    {:else if !metrics}
        <p class="status">wait for metrics...</p>
    {:else}
        <div class="grid">
            <div class="card">
                <h2>CPU</h2>
                <div class="value">{metrics.cpu.usage_percent.toFixed(1)}%</div>
            </div>

            <div class="card">
                <h2>RAM</h2>
                <div class="value">
                    {(metrics.mem.available / 1024 / 1024).toFixed(2)} GB /
                    {(metrics.mem.total / 1024 / 1024).toFixed(2)} GB
                </div>
                <small>free / all</small>
            </div>
        </div>
    {/if}
</main>

<style>
    main {
        font-family:
            system-ui,
            -apple-system,
            sans-serif;
        max-width: 800px;
        margin: 40px auto;
        padding: 0 20px;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .card {
        background: #1e1e2e;
        color: #cdd6f4;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card h2 {
        margin: 0 0 12px 0;
        font-size: 1.1rem;
        color: #a6adc8;
    }

    .value {
        font-size: 1.8rem;
        font-weight: bold;
        color: #89b4fa;
    }

    .status {
        color: #a6adc8;
    }

    .status.error {
        color: #f38ba8;
    }
</style>
