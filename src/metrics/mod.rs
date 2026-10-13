pub mod cpu;
pub mod mem;

use std::{
    fs::File,
    io::{self, Read},
    str::Utf8Error,
};

use thiserror::Error;

use cpu::CpuMetrics;
use mem::MemoryMetrics;

pub struct MetricsCollector {
    buf: [u8; 8192],
}

pub struct SystemMetrics {
    pub mem: MemoryMetrics,
    pub cpu: CpuMetrics,
}

#[derive(Error, Debug)]
pub enum MetricsError {
    #[error("i/o error: {0}")]
    Io(#[from] io::Error),

    #[error("utf-8 error: {0}")]
    Utf8(#[from] Utf8Error),

    #[error("failed to parse /proc")]
    ParseError,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self { buf: [0u8; 8192] }
    }

    pub fn collect(&mut self) -> Result<SystemMetrics, MetricsError> {
        let mem_str = get_info("/proc/meminfo", &mut self.buf)?;
        let mem = mem_str.parse::<MemoryMetrics>()?;

        let cpu_str = get_info("/proc/stat", &mut self.buf)?;
        let cpu = cpu_str.parse::<CpuMetrics>()?;

        Ok(SystemMetrics { mem, cpu })
    }
}

pub fn get_info<'a>(path: &str, buf: &'a mut [u8]) -> Result<&'a str, MetricsError> {
    let mut file = File::open(path)?;
    let mut read_bytes = 0;

    loop {
        let bytes = file.read(&mut buf[read_bytes..])?;

        if bytes == 0 {
            break;
        }

        read_bytes += bytes;
    }

    Ok(std::str::from_utf8(&buf[..read_bytes])?)
}
