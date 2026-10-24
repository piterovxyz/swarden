<script lang="ts">
    import { onMount } from "svelte";
    import "./App.css";
    import GaugeSemicircle from "./GaugeSemicircle.svelte";
    import { subscribeToMetrics, type Metrics } from "./metrics";

    let metrics = $state<Metrics | null>(null);
    let error = $state(false);

    let memoryPercent = $derived(
        metrics && metrics.mem.total > 0
            ? Math.min(
                  (Math.max(metrics.mem.total - metrics.mem.available, 0) /
                      metrics.mem.total) *
                      100,
                  100,
              )
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
    <meta name="color-scheme" content="dark" />
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

        <div class="metrics-row">
            <GaugeSemicircle
                label="CPU"
                variant="cpu"
                percent={cpuPercent}
                loading={!metrics}
            />
            <GaugeSemicircle
                label="Memory"
                variant="memory"
                percent={memoryPercent}
                loading={!metrics}
            />
        </div>
    </div>
</main>
