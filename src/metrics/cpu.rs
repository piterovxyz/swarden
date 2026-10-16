use super::MetricsError;

#[derive(Debug, Clone, Copy)]
pub struct CpuTicks {
    pub total: u64,
    pub idle: u64,
}

impl std::str::FromStr for CpuTicks {
    type Err = MetricsError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut ticks = CpuTicks { total: 0, idle: 0 };
        if let Some(cpu_stat) = s.lines().next() {
            ticks.idle = cpu_stat
                .split_whitespace()
                .skip(4)
                .take(2)
                .filter_map(|s| s.parse::<u64>().ok())
                .sum();

            ticks.total = cpu_stat
                .split_whitespace()
                .filter_map(|i| i.parse::<u64>().ok())
                .sum();
        }
        Ok(ticks)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct CpuMetrics {
    pub usage_percent: f64,
}
