# swarden

lightweight monitoring for linux servers

## running

with docker compose:

```bash
curl -LO https://github.com/piterovxyz/swarden/releases/latest/download/compose.yml
docker compose -f compose.yml up -d
```

the server listens on `127.0.0.1:6701` by default. to change the port, set `PORT` and the host mapping in `compose.yml`.

## api

`GET /sse` returns a server-sent events stream (`text/event-stream`) with a new message every 500 ms:

```
data: {"cpu":{"usage_percent":12.5},"mem":{"total":16384000,"available":8192000}}
```

memory values are in kB, as in `/proc/meminfo`. any other path returns `404`.

## development

requires node 26+ and linux (the server reads `/proc/stat` and `/proc/meminfo`).

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm start
```

`npm run dev` restarts the server on file changes.

## building the image

```bash
docker build -t swarden .
```

## license

see [LICENSE](LICENSE).
