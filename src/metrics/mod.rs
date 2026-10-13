use crate::metrics::mem::{MemInfoError, MemoryMetrics};

pub mod mem;

pub struct MetricsCollector {
    buf: [u8; 8192],
}

pub struct SystemMetrics {
    pub mem: MemoryMetrics,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self { buf: [0u8; 8192] }
    }

    pub fn collect(&mut self) -> Result<SystemMetrics, MemInfoError> {
        let mem = mem::get_info(&mut self.buf)?;

        Ok(SystemMetrics { mem })
    }
}
