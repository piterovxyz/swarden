<script lang="ts">
    interface Props {
        label: string;
        percent: number;
        variant: "cpu" | "memory";
        memTotal?: number;
        memAvailable?: number;
        loading?: boolean;
    }

    let {
        label,
        percent,
        variant,
        memTotal = 0,
        memAvailable = 0,
        loading = false,
    }: Props = $props();

    const arcPath = "M 80.5 156.5 A 74 74 0 1 1 119.5 156.5";

    let clamped = $derived(Math.min(Math.max(percent, 0), 100));
    let fillClass = $derived(
        variant === "cpu" ? "gauge-fill-cpu" : "gauge-fill-memory",
    );
    let ariaLabel = $derived(
        loading ? `${label} loading` : `${label} ${clamped.toFixed(1)} percent`,
    );
</script>

<div
    class="gauge"
    role="img"
    aria-label={ariaLabel}
    title={loading ? undefined : `${clamped.toFixed(1)}%`}
>
    <div class="gauge-shell">
        <svg class="gauge-svg" viewBox="0 0 200 168" aria-hidden="true">
            <path class="gauge-track" d={arcPath} pathLength="100" />
            {#if !loading && clamped > 0}
                <path
                    class="gauge-fill {fillClass}"
                    d={arcPath}
                    pathLength="100"
                    style={`stroke-dasharray: ${clamped} 100`}
                />
            {/if}
        </svg>
        <div class="gauge-inner">
            <span class="metric-label gauge-label">{label}</span>
            <div class="gauge-percent">
                {#if loading}
                    —
                {:else}
                    {clamped.toFixed(1)}<span class="gauge-percent-suffix"
                        >%</span
                    >
                {/if}
            </div>
            {#if variant === "memory" && memTotal != null && memAvailable != null}
                <div class="gauge-mem">
                    {#if loading}
                        —
                    {:else}
                        {memTotal.toFixed(1)}<span class="gauge-mem-mb">MB</span
                        >
                        <span class="gauge-mem-separator">/</span>
                        {memAvailable.toFixed(1)}<span class="gauge-mem-mb"
                            >MB</span
                        >
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
