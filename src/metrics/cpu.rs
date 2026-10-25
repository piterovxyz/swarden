use super::MetricsError;

use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct CpuMetrics {
    pub usage_percent: f64,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub struct CpuTicks {
    pub total: u64,
    pub idle: u64,
}

impl std::str::FromStr for CpuTicks {
    type Err = MetricsError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if !s.starts_with("cpu ") {
            return Err(MetricsError::ParseError);
        }
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
                .take(8)
                .sum();
        }
        if ticks.total == 0 {
            return Err(MetricsError::ParseError);
        }
        Ok(ticks)
    }
}
