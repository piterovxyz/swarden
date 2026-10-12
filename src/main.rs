use swarden_agent::get_mem_info;
use swarden_core::parse_metrics;

fn main() {
    let mut buf = [0u8; 4096];

    match get_mem_info(&mut buf) {
        Ok(str) => {
            if let Some(metrics) = parse_metrics(str) {
                println!("Available: {} MB", metrics.available_kb / 1024);
                println!("Total: {} MB", metrics.total_kb / 1024);
            }
        }
        Err(err) => eprintln!("error getting mem info, {}", err),
    }
}
