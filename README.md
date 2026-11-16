# swarden

monitoring for linux servers

## running

with docker compose:

```bash
curl -LO https://github.com/piterovxyz/swarden/releases/latest/download/compose.yml
docker compose -f compose.yml up -d
```

one container serves both the dashboard and the api on `http://127.0.0.1:8080`. the defaults work without any `.env` file.

## configuration

compose reads variables from a `.env` file next to `compose.yml`. copy the example and edit it:

```bash
cp .env.example .env
```

| variable   | default     | description                                  |
| ---------- | ----------- | -------------------------------------------- |
| `HOST`     | `127.0.0.1` | address on the host the port is published on |
| `WEB_PORT` | `8080`      | host port of the dashboard and the api       |

## api

`GET /api/sse` returns a sse with a new message every 500 ms:

```
data: {"cpu":{"usage_percent":12.5},"mem":{"total":16384000,"available":8192000}}
```

memory values are in kB.

## development

requires node 26+ and linux (the server reads `/proc/stat` and `/proc/meminfo`).

```bash
npm ci
npm run start:server
npm run start:web
```

- `npm run start:server` runs the api only. the dashboard is served by the server only when `WEB_DIST` points to a built `web/dist`, which the image sets, so outside docker you get the api and no dashboard.
- `npm run dev:server` restarts the server on file changes. it listens on `PORT` (default `6701`).
- `npm run dev:web` starts the vite dev server on `5173`. it proxies `/api` to `127.0.0.1:6701`, so run the server with the default port.

## building the image

build the image and start it with:

```bash
docker compose up --build
```

## license

see [LICENSE](LICENSE).
