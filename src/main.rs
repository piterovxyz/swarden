use swarden_agent::get_mem_info;
use swarden_core::parse_mem;

fn main() {
    let mut buf = [0u8; 4096];

    match get_mem_info(&mut buf) {
        Ok(str) => {
            if let Some(metrics) = parse_mem(str) {
                println!("Available: {} MB", metrics.available_mb);
                println!("Total: {} MB", metrics.total_mb);
                println!("Used: {:.1}%", metrics.used_percent);
            }
        }
        Err(err) => eprintln!("error getting mem info, {}", err),
    }
}
