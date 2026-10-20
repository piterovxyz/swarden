package server

import (
	"embed"
	"io/fs"
)

//go:embed dist/*
var dist embed.FS

func GetAssets(path string) (fs.FS, error) {
	return fs.Sub(dist, "dist")
}
