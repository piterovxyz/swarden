pub mod cpu;
pub mod mem;

use std::{
    fs::File,
    io::{self, Read},
    str::Utf8Error,
};

use thiserror::Error;

use cpu::{CpuMetrics, CpuTicks};
use mem::MemoryMetrics;

#[derive(Debug, Clone, Copy)]
pub struct SystemMetrics {
    pub mem: MemoryMetrics,
    pub cpu: CpuMetrics,
}

impl From<SystemMetrics> for String {
    fn from(value: SystemMetrics) -> Self {
        format!(
            "CPU: {:.1}%\nMem Total: {} KB\nMem Available: {} KB",
            value.cpu.usage_percent, value.mem.total, value.mem.available
        )
    }
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

pub struct MetricsCollector {
    buf: [u8; 8192],
    prev_tick: Option<CpuTicks>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            buf: [0u8; 8192],
            prev_tick: None,
        }
    }

    pub fn collect(&mut self) -> Result<SystemMetrics, MetricsError> {
        let meminfo = get_info("/proc/meminfo", &mut self.buf)?;
        let mem = meminfo.parse::<MemoryMetrics>()?;

        let stat = get_info("/proc/stat", &mut self.buf)?;
        let tick = stat.parse::<CpuTicks>()?;

        let cpu_usage = if let Some(ptick) = self.prev_tick {
            let delta_total = tick.total.saturating_sub(ptick.total);
            let delta_idle = tick.idle.saturating_sub(ptick.idle);

            if delta_total > 0 {
                (delta_total - delta_idle) as f64 / delta_total as f64 * 100.0
            } else {
                0.0
            }
        } else {
            0.0
        };

        self.prev_tick = Some(tick);

        Ok(SystemMetrics {
            mem,
            cpu: CpuMetrics {
                usage_percent: cpu_usage,
            },
        })
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
