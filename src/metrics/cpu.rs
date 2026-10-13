use super::MetricsError;

pub struct CpuMetrics {
    pub total: u64,
    pub idle: u64,
}

impl std::str::FromStr for CpuMetrics {
    type Err = MetricsError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut metrics = CpuMetrics { total: 0, idle: 0 };
        if let Some(cpu_stat) = s.lines().next() {
            metrics.idle = cpu_stat
                .split_whitespace()
                .skip(4)
                .take(2)
                .filter_map(|s| s.parse::<u64>().ok())
                .sum();

            metrics.total = cpu_stat
                .split_whitespace()
                .filter_map(|i| i.parse::<u64>().ok())
                .sum();
        }
        Ok(metrics)
    }
}
