package server

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:generate sh -c "cd ../../ui && bun i && bun run build"

//go:embed all:dist
var assets embed.FS

func UIHandler() http.Handler {
	sub, err := fs.Sub(assets, "dist")
	if err != nil {
		panic(err)
	}
	return http.FileServerFS(sub)
}
