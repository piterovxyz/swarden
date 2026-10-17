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
