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
npm run dev:server
npm run dev:web
```

## building the image

build the image and start it with:

```bash
docker compose up --build
```

## license

see [LICENSE](LICENSE).
