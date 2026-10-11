use swarden_agent::get_mem_info;

fn main() {
    let mut buf = [0u8; 4096];
    match get_mem_info(&mut buf) {
        Ok(res) => println!("{}", res),
        Err(err) => eprintln!("error getting mem info, {}", err),
    }
}
