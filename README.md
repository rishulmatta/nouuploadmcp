# No Upload

No Upload is a local consent gateway that lets a person and an AI agent work together on private PDFs without uploading the documents to an application server. The browser extracts and stores the data locally; WebMCP exposes narrow, structured tools; and the person approves disclosures and proposed writes.

- **Live app:** [nouploadmcp.app](https://nouploadmcp.app)
- **Submission notes and demo script:** [docs/SUBMISSION.md](./docs/SUBMISSION.md)
- **License:** [MIT](./LICENSE)

## Why WebMCP

Bank statements and lab reports are useful agent context, but uploading entire documents gives the agent more information than it needs. WebMCP allows No Upload to expose purpose-built operations from inside the page. The human loads documents locally, the agent requests only the data or action needed, and the page enforces consent and stages mutations for review.

Together, a person and agent can extract records, reconcile statements, classify spending, inspect lab trends, and draft editable plans while the page remains the authority for disclosure and persistence. Without WebMCP, this workflow would require either uploading the source documents or asking an agent to infer actions by clicking through an interface.

## What the human and agent do

| Human | Agent through WebMCP |
|---|---|
| Loads local PDFs or bundled samples | Discovers and selects a document plugin |
| Grants or denies requested disclosures | Requests scoped, redacted page data |
| Accepts or rejects extracted records | Proposes transactions or lab results |
| Reviews category mappings and plans | Analyses accepted data and proposes mappings or plans |
| Adjusts sliders and retains final authority | Reads the live human-edited state before evaluating feasibility |

No agent tool can silently commit a staged transaction, lab result, mapping, or plan. Those actions require an explicit human approval in the page.

## Judge quick start

### Option A: deployed app

1. Open [nouploadmcp.app](https://nouploadmcp.app) in the ChatGPT desktop app's in-app browser, which supports WebMCP by default.
2. Alternatively, use Google Chrome 149 or later, enable `chrome://flags/#enable-webmcp-testing`, restart Chrome, and open the app.
3. Choose **Financial statements**, then select **Load samples**.
4. Ask the connected agent: `List the available tools, select the finance plugin, and propose transactions from the loaded statements.`
5. Accept several proposed transactions in the page.
6. Ask: `Show my monthly cashflow, propose useful category mappings, and draft a savings plan.`
7. Review the visible proposals, approve or reject them, edit the plan sliders, then ask: `Is the plan currently feasible?`

No login, API key, paid account, or special credentials are required for the app. Bundled synthetic PDFs are provided so judges do not need to use personal documents.

### Testing fixtures

All fixtures contain synthetic data and can be downloaded directly from the public repository:

- [Finance statement fixtures](https://github.com/rishulmatta/nouuploadmcp/tree/main/fixtures/finance) - 12 monthly statement PDFs using US dollar (`$`) amounts.
- [Lab report fixtures](https://github.com/rishulmatta/nouuploadmcp/tree/main/fixtures/labs) - four quarterly blood-test PDFs.
- [Finance fixture design and deliberate test cases](./fixtures/GENERATOR.md)
- [Lab fixture design and deliberate test cases](./fixtures/labs/GENERATOR.md)

The deployed app also provides **Load samples**, so downloading these files is optional.

### Option B: run locally

Prerequisites: Node.js 20 or later and npm.

```bash
git clone https://github.com/rishulmatta/nouuploadmcp.git
cd nouuploadmcp
npm ci
npm run dev
```

Open `http://localhost:5173` in a WebMCP-capable browser. To test the production build:

```bash
npm run build
npm run preview
```

## How WebMCP is implemented

The registration adapter is in [`src/core/mcp/registry.ts`](./src/core/mcp/registry.ts). It converts each internal tool specification to a WebMCP input schema and registers it with the browser-provided API:

```ts
document.modelContext.registerTool({
  name: spec.name,
  description: spec.description,
  inputSchema,
  execute: async (input) => registry.invoke(spec.name, input),
})
```

The implementation also supports hosts that expose `modelContext` on `window` or `navigator`, re-registers tools if the agent context arrives after page load, and uses `AbortController` signals when replacing dynamically scoped tools. Core tools register at startup. Finance or labs tools register when that plugin is selected, and document-shaped schemas refresh after ingest.

See [docs/WEBMCP.md](./docs/WEBMCP.md) for the complete tool surface, authority tiers, consent behavior, and suggested test prompts.

## Privacy and architecture

- PDF parsing, OCR, redaction, staging, and analysis run in the browser.
- Raw files and derived records are stored in browser-owned OPFS/IndexedDB storage.
- The app has no application backend and does not transmit document contents to one.
- Consent-gated reads are audited; denied fields are redacted unless the human grants access.
- Proposed writes remain memory-only until the person accepts them.
- Bundled sample statements and lab reports contain synthetic data only.

Static application assets are downloaded from the hosting provider when the page loads. The privacy claim concerns user document bytes and derived private data, not ordinary delivery of the website itself.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for storage and security invariants.

## Project structure

```text
src/core/              Local ingest, consent, storage, staging, and WebMCP registry
src/plugins/finance/   Statement extraction, categorisation, analytics, and planning
src/plugins/labs/      Lab extraction, trends, reference ranges, and diet-plan review
public/fixtures/       Synthetic PDFs available from the deployed app
public/tesseract/      Vendored OCR runtime assets for local in-browser OCR
docs/                  Architecture, WebMCP, and submission documentation
```

## Scope and safety boundaries

- Financial output is descriptive planning support, not investment, allocation, instrument, tax, or credit advice.
- Lab output organises measurements and supports food-plan review; it does not diagnose, prescribe, recommend dosing, or replace clinical care.
- There are no accounts, cloud sync, document sharing, or product telemetry.

## Hackathon provenance

No Upload was created during the WebMCP Challenge submission period. The first repository commit is `5101535`, dated August 28, 2026, after the submission period opened on August 25, 2026. The dated Git history records the implementation from the initial Vite/WebMCP skeleton through the finance and labs workflows. There is no pre-hackathon codebase to distinguish.

## License

Copyright © 2026 Rishul Matta. Released under the [MIT License](./LICENSE).
