#[derive(Debug, Default)]
pub struct MemoryMetrics {
    pub total_kb: u64,
    pub available_kb: u64,
}

pub fn parse_metrics(content: &str) -> Option<MemoryMetrics> {
    let mut metrics_data: MemoryMetrics = MemoryMetrics::default();

    for line in content.lines() {
        if let Some((k, v)) = parse_entry(line) {
            match k.trim_end_matches(':') {
                "MemTotal" => metrics_data.total_kb = v,
                "MemAvailable" => metrics_data.available_kb = v,
                _ => {}
            }
            if metrics_data.total_kb > 0 && metrics_data.available_kb > 0 {
                break;
            }
        }
    }

    if metrics_data.total_kb > 0 && metrics_data.available_kb > 0 {
        Some(metrics_data)
    } else {
        None
    }
}

fn parse_entry(line: &str) -> Option<(&str, u64)> {
    let mut parts = line.split_whitespace();

    let key = parts.next()?;
    let value = parts.next()?.parse::<u64>().ok()?;

    Some((key, value))
}
