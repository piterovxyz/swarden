use super::MetricsError;

pub struct CpuMetrics {
    total: u64,
    idle: u64,
}

impl std::str::FromStr for CpuMetrics {
    type Err = MetricsError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(CpuMetrics { total: 0, idle: 0 })
    }
}
