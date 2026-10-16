use super::MetricsError;

#[derive(Debug, Clone, Copy)]
pub struct MemoryMetrics {
    pub total: u64,
    pub available: u64,
}

impl std::str::FromStr for MemoryMetrics {
    type Err = MetricsError;

    fn from_str(content: &str) -> Result<Self, Self::Err> {
        let mut total_kb: u64 = 0;
        let mut available_kb: u64 = 0;

        for line in content.lines() {
            let mut parts = line.split_whitespace();

            if let (Some(k), Ok(v)) = (
                parts.next(),
                parts.next().ok_or(MetricsError::ParseError)?.parse::<u64>(),
            ) {
                match k.trim_end_matches(':') {
                    "MemTotal" => total_kb = v,
                    "MemAvailable" => available_kb = v,
                    _ => {}
                }
                if total_kb > 0 && available_kb > 0 {
                    break;
                }
            }
        }

        if total_kb > 0 && available_kb > 0 {
            Ok(MemoryMetrics {
                total: total_kb,
                available: available_kb,
            })
        } else {
            Err(MetricsError::ParseError)
        }
    }
}
