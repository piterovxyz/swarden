use std::{fmt::Display, fs::File, io, io::Read, str::Utf8Error};

use crate::mem_info::MemInfoError::{Io, Utf8};

pub enum MemInfoError {
    Io(io::Error),
    Utf8(Utf8Error),
}

impl Display for MemInfoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Io(err) => write!(f, "{}", err),
            Utf8(err) => write!(f, "{}", err),
        }
    }
}

pub fn get_mem_info(buf: &mut [u8]) -> Result<&str, MemInfoError> {
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
        Ok(res) => Ok(res),
        Err(err) => Err(MemInfoError::Utf8(err)),
    }
}
