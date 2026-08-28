# No Upload

A local consent gateway that lets agents work on your private documents without the documents ever leaving your device.

Live demo: **https://nouploadmcp.app** (Vercel)

## What this is

- Your PDFs stay in your browser. Nothing is uploaded. There is no backend.
- The agent drives the page through WebMCP tools.
- Your job is **validate, filter, authorize** — deciding what may flow to the agent, and approving anything the agent wants to write back.
- Document types are plugins: financial transactions (primary) and blood test reports (secondary).

## Why it fits WebMCP

Bank statements and lab reports are exactly the documents people cannot upload. Because WebMCP tools execute inside the page, the documents stay local while an agent still does real work on them. The page becomes a consent boundary no server-side MCP can be.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build

```bash
npm run build
```

## Try it

1. Open the live URL.
2. Click **Financial statements** → **Load samples**.
3. Click **Extract transactions**.
4. Accept/reject proposals; the audit log records every disclosure.
5. Set a savings goal and drag the sliders.

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## WebMCP tool surface

See [docs/WEBMCP.md](./docs/WEBMCP.md).

## Scope

- Text-layer PDFs only; scanned documents are not supported.
- No financial product, allocation, or instrument recommendations.
- No clinical interpretation, diagnosis, dosing, or supplement guidance.
- No accounts, sync, sharing, or telemetry.
- Labs plugin is present as an unwired skeleton (secondary, gated on completion).

## License

MIT — see [LICENSE](./LICENSE).
