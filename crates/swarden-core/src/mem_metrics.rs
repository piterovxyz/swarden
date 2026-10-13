#[derive(Debug, Default)]
pub struct MemoryMetrics {
    pub total_mb: u64,
    pub available_mb: u64,
    pub used_percent: f64,
}

pub fn parse_mem(content: &str) -> Option<MemoryMetrics> {
    let mut total_kb: u64 = 0;
    let mut available_kb: u64 = 0;

    for line in content.lines() {
        if let Some((k, v)) = parse_entry(line) {
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
        Some(MemoryMetrics {
            total_mb: total_kb / 1024,
            available_mb: available_kb / 1024,
            used_percent: (total_kb - available_kb) as f64 / (total_kb as f64 / 100.0),
        })
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
