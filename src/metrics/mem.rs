use std::{
    fmt::Display,
    fs::File,
    io::{self, Read},
    str::Utf8Error,
};

use crate::metrics::mem::MemInfoError::{Io, ParseError, Utf8};

#[derive(Debug, Default)]
pub struct MemoryMetrics {
    pub total_mb: u64,
    pub available_mb: u64,
    pub used_percent: f64,
}

pub enum MemInfoError {
    Io(io::Error),
    Utf8(Utf8Error),
    ParseError,
}

impl Display for MemInfoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Io(err) => write!(f, "{}", err),
            Utf8(err) => write!(f, "{}", err),
            ParseError => write!(f, "error parsing mem"),
        }
    }
}

pub fn get_info(buf: &mut [u8]) -> Result<MemoryMetrics, MemInfoError> {
    let mut file = File::open("/proc/meminfo").map_err(MemInfoError::Io)?;
    let mut read_bytes = 0;

    loop {
        let bytes = file
            .read(&mut buf[read_bytes..])
            .map_err(MemInfoError::Io)?;

        if bytes == 0 {
            break;
        }

        read_bytes += bytes;
    }

    match std::str::from_utf8(&buf[..read_bytes]) {
        Ok(res) => {
            if let Some(mem_info) = parse_mem(res) {
                Ok(mem_info)
            } else {
                Err(MemInfoError::ParseError)
            }
        }
        Err(err) => Err(MemInfoError::Utf8(err)),
    }
}

fn parse_mem(content: &str) -> Option<MemoryMetrics> {
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
