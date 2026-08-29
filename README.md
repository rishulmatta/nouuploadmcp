# No Upload

No Upload is a local consent gateway that lets a person and an AI agent work together on private PDFs without uploading the documents to an application server. The browser extracts and stores the data locally; WebMCP exposes narrow, structured tools; and the person approves disclosures and proposed writes.

- **Live app:** [nouploadmcp.app](https://nouploadmcp.app)
- **Submission notes and demo script:** [docs/SUBMISSION.md](./docs/SUBMISSION.md)
- **License:** [MIT](./LICENSE)

## Why WebMCP

WebMCP lets No Upload offer useful agent workflows without handing the agent unrestricted copies of sensitive documents. The PDFs remain in the browser, the page exposes purpose-built operations, and every extracted record or proposed change stays under human control.

### Bank statements

A person can load months of statements, review the locally extracted transactions, and choose which rows the agent may process. The agent then uses WebMCP tools to categorise only those accepted transactions, propose merchant mappings, render spending charts, and draft an editable savings or repayment plan. After the person adjusts sliders or adds constraints, the agent can read the live plan and check it against actual cashflow—without accessing rejected transactions or raw statement pages.

### Medical lab reports and diet plans

A person can load multiple lab reports, verify each locally extracted result, and approve the measurements used for analysis. The agent can plot trends, identify results outside their supplied reference ranges, and propose a food-based plan in a reviewable table. The person can remove unsuitable items, add allergy information, or challenge a dietary claim; the agent then reads the revised plan and publishes a final review. The workflow organises results and diet ideas without exposing entire medical reports or turning the agent into the authority for diagnosis or treatment.

In both cases, WebMCP provides a semantic alternative to uploading the source files or relying on fragile browser clicks. The page remains the authority for disclosure, approval, and persistence while the agent supplies reasoning and coordination.

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

Follow one complete story: turn a year of statements into a realistic plan for buying a Tesla Model Y.

1. Open [nouploadmcp.app](https://nouploadmcp.app) in the ChatGPT desktop app's in-app browser, choose **Financial statements**, then click **Load samples**. The PDFs stay in the browser.
2. Ask: `Extract the transactions from all my statements and put them on the page for me to review.` The agent creates a review table without receiving the unapproved transaction details.
3. In the table, select only the transactions you want included. Accept those rows and reject the rest. This is the privacy boundary: subsequent analysis uses only your accepted selection.
4. Ask: `Use my accepted transactions—not raw statement text—to categorise my spending and show me a pie chart.` The agent reads only the structured rows you approved, proposes merchant mappings for review, and renders the chart. Approve the useful mappings and watch it update.
5. Ask: `I want to buy a Tesla Model Y and save $50,000 toward it. Use my actual monthly spending to propose a realistic savings plan and put it on the page.` Review the agent's category reductions, monthly savings, timeline, and feasibility result, then accept the proposal.
6. Make it personal: drag the savings slider, adjust a category target, or add a note such as `Keep my gym membership`. Then ask: `Read the plan as it appears now. Is it still feasible, and what should I change to reach the Tesla goal sooner without cutting the gym?`

The payoff is visible: private PDFs become a user-filtered dataset, an approved category model, and a live goal plan that the human and agent can revise together—without uploading the statements.

Google Chrome 149 or later is also supported after enabling `chrome://flags/#enable-webmcp-testing` and restarting Chrome.

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
