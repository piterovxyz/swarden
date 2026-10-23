package metrics

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetInfo(t *testing.T) {
	t.Run("file contents", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "meminfo")
		body := []byte("MemTotal: 16384 kB\nMemAvailable: 8192 kB\n")
		if err := os.WriteFile(path, body, 0o644); err != nil {
			t.Fatal(err)
		}

		var buf [8192]byte
		got, err := getInfo(path, &buf)
		if err != nil {
			t.Fatalf("getInfo: %v", err)
		}
		if !bytes.Equal(got, body) {
			t.Fatalf("getInfo = %q, want %q", got, body)
		}
	})

	t.Run("empty file", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "empty")
		if err := os.WriteFile(path, nil, 0o644); err != nil {
			t.Fatal(err)
		}

		var buf [8192]byte
		got, err := getInfo(path, &buf)
		if err != nil {
			t.Fatalf("getInfo: %v", err)
		}
		if len(got) != 0 {
			t.Fatalf("getInfo = %q, want empty", got)
		}
	})

	t.Run("stops at buffer size", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "large")
		body := append(bytes.Repeat([]byte("a"), 8192), []byte("TAIL")...)
		if err := os.WriteFile(path, body, 0o644); err != nil {
			t.Fatal(err)
		}

		var buf [8192]byte
		got, err := getInfo(path, &buf)
		if err != nil {
			t.Fatalf("getInfo: %v", err)
		}
		if len(got) != len(buf) || !bytes.Equal(got, body[:len(buf)]) {
			t.Fatalf("getInfo length = %d, want %d prefix", len(got), len(buf))
		}
	})

	t.Run("missing file", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "missing")
		var buf [8192]byte
		_, err := getInfo(path, &buf)
		if err == nil || !errors.Is(err, os.ErrNotExist) || !strings.HasPrefix(err.Error(), "opening ") {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("read error", func(t *testing.T) {
		path := t.TempDir()
		var buf [8192]byte
		_, err := getInfo(path, &buf)
		if err == nil || errors.Is(err, os.ErrNotExist) || !strings.HasPrefix(err.Error(), "reading ") {
			t.Fatalf("error = %v, want a read error", err)
		}
	})
}
