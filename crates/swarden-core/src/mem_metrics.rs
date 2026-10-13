#[derive(Debug, Default)]
pub struct MemoryMetrics {
    pub total_mb: u32,
    pub available_mb: u32,
    pub used_percent: f32,
}

pub fn parse_mem(content: &str) -> Option<MemoryMetrics> {
    let mut metrics_data: MemoryMetrics = MemoryMetrics::default();

    for line in content.lines() {
        if let Some((k, v)) = parse_entry(line) {
            match k.trim_end_matches(':') {
                "MemTotal" => metrics_data.total_mb = (v as f32 / 1024.0) as u32,
                "MemAvailable" => metrics_data.available_mb = (v as f32 / 1024.0) as u32,
                _ => {}
            }
            if metrics_data.total_mb > 0 && metrics_data.available_mb > 0 {
                break;
            }
        }
    }

    if metrics_data.total_mb > 0 && metrics_data.available_mb > 0 {
        let used_kb = metrics_data.total_mb - metrics_data.available_mb;
        metrics_data.used_percent = used_kb as f32 / (metrics_data.total_mb as f32 / 100.0);
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
