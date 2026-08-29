# Devpost submission package

This file contains submission-ready copy and a final compliance checklist for the WebMCP Challenge. Replace the marked video placeholder before submitting.

## Submission fields

### Project name

No Upload

### Tagline

Let an agent work with your private documents without uploading them.

### Live URL

https://nouploadmcp.app

### Public repository

https://github.com/rishulmatta/nouuploadmcp

### Demonstration video

`TODO: Add the public YouTube URL. The finished video must be under three minutes.`

### Description

No Upload is a local consent gateway for agent-assisted work on sensitive PDFs. A person loads bank statements or blood-test reports into the browser, where extraction, OCR, redaction, storage, staging, and analysis happen locally. The site exposes structured WebMCP tools so an agent can help without receiving an unrestricted copy of the source documents.

This is a strong fit for WebMCP because the web page—not a remote agent service—remains the authority for both disclosure and writes. The agent can discover plugins, request scoped data, propose extracted records, reconcile statements, analyse spending or lab trends, and draft plans. The person sees every sensitive request and every proposed mutation in context, and explicitly grants, accepts, edits, or rejects it. WebMCP turns the page into a precise collaboration boundary rather than forcing an agent to guess at UI controls or requiring the user to upload whole documents.

The experience is better for people because it combines natural-language delegation with visible control. Synthetic samples make the workflow immediately testable. Proposed transactions, mappings, reference ranges, and plans appear in the UI before they become durable. The human can adjust a plan with sliders, and the agent can then read the live edited state and assess it against accepted records. This tight human-agent loop was difficult before: conventional chat requires broad uploads, while conventional browser automation has no semantic contract for consent, provenance, or staged writes.

WebMCP is implemented in a central TypeScript registry. Internal tool definitions are converted to JSON input schemas and passed to `document.modelContext.registerTool`, with an `execute` function routed through the app's audited dispatcher. Core tools register at startup; finance and labs tools register dynamically when selected; document-aware tools refresh after ingest. The implementation handles late browser injection of `modelContext` and uses abort signals to replace stale registrations. Tool authority tiers distinguish reads, attention-only UI actions, consent-gated disclosures, staged writes, and page-owned memory.

All app code was created during the challenge period. The repository's first commit is dated August 28, 2026, and its public history documents the build from the initial WebMCP skeleton onward.

## Suggested technologies/tags

WebMCP, TypeScript, React, Vite, browser APIs, OPFS, IndexedDB, PDF.js, Tesseract.js, privacy, human-in-the-loop

## Additional Devpost story fields

Use these if the submission form presents Devpost's standard project-story prompts.

### Inspiration

People increasingly want agents to help with financial and health documents, but the normal interaction begins by uploading the most sensitive file in full. We wanted to invert that model: keep the document under the person's control and bring a narrowly authorised agent interface to the data.

### What it does

No Upload parses bank statements and lab reports entirely in the browser. An agent can call semantic WebMCP tools to propose records, request redacted data, run analyses, render charts, and draft plans. The human remains in the loop for every disclosure and durable change.

### How we built it

The app is a React and TypeScript single-page application. PDF.js extracts text layers, a vendored Tesseract.js runtime handles scanned pages, and OPFS/IndexedDB retain local state. A central WebMCP registry turns typed internal tool definitions into JSON schemas and registers them with `document.modelContext.registerTool`. Plugin-scoped finance and labs tools share consent, audit, staging, and storage primitives.

### Challenges

The hardest design problem was preserving a useful agent workflow without making the agent implicitly authoritative. We separated tool capabilities into read, attention, consent, staged, and memory tiers; made proposals visible before commit; carried document/page anchors into accepted records; and refreshed dynamic tools when documents or plugins changed.

### Accomplishments

The result is a coherent human-agent workflow rather than a tool-call demo: it handles local PDF/OCR ingest, scoped disclosure, auditable consent, reviewable extraction, mappings, charts, goal planning, live human edits, and feasibility checks across two document domains.

### What we learned

WebMCP works best when tools describe responsibility as well as capability. A small operation such as `propose_transactions` becomes much safer and more understandable when the surrounding page owns consent, staging, provenance, and final approval.

### What's next

Next steps include more document plugins, export and backup controlled by the user, stronger automated privacy regression tests, and broader interoperability testing as the WebMCP standard evolves.

## Testing instructions for judges

1. Open https://nouploadmcp.app in ChatGPT's in-app browser. Google Chrome 149+ also works after enabling `chrome://flags/#enable-webmcp-testing` and restarting.
2. Open **Financial statements** and click **Load samples**. The samples are synthetic.
3. Ask the agent: `Select the finance plugin and propose transactions from the loaded statements.`
4. Accept several proposals on the page.
5. Ask: `Summarise my spending, propose category mappings, plot category spend, and draft a savings plan.`
6. Approve a mapping and the plan, move a plan slider, then ask: `Read the current plan and tell me whether it is feasible.`
7. Optional labs path: open **Blood test reports**, load samples, and ask: `Select the labs plugin, propose results, show out-of-range measurements, plot the relevant series, and propose a food-based plan.`

No login credentials or API keys are required.

## Demo video script (target: 2:35)

The rules require a public YouTube video shorter than three minutes, with audio that explains both the product and its WebMCP usage.

| Time | Screen | Narration focus |
|---|---|---|
| 0:00–0:15 | Landing page and privacy statement | The problem: private documents are useful context but unsafe to upload wholesale. |
| 0:15–0:35 | Finance samples loaded in a WebMCP-capable browser | PDFs and extraction stay in the browser; the agent connects through structured page tools. |
| 0:35–1:05 | Agent calls `select_plugin` and `propose_transactions`; review UI appears | Show genuine WebMCP calls and explain that proposals are not committed automatically. |
| 1:05–1:30 | Human accepts/rejects records; audit/consent UI | The person controls disclosure and writes; provenance points back to document/page anchors. |
| 1:30–2:00 | Agent proposes mappings, plots spending, and drafts a savings plan | Demonstrate a non-trivial multi-tool workflow and visible output. |
| 2:00–2:20 | Human moves a slider; agent calls current-plan/feasibility tools | Show live collaboration: the agent evaluates the person's edited state, not stale chat state. |
| 2:20–2:35 | Tools or architecture screen and closing view | Briefly identify `document.modelContext.registerTool`, local storage, and the impact. |

Recording notes:

- Keep the final uploaded duration below `3:00`; aim for `2:35–2:45`.
- Capture the actual deployed project functioning, including visible agent tool calls or outcomes.
- Use spoken audio to explain what was built and how WebMCP is used.
- Upload publicly to YouTube.
- Do not use copyrighted music or third-party footage, logos, or assets without permission.
- Use only the bundled synthetic documents; do not expose personal data in the recording.

## Compliance checklist

### Already satisfied in this repository

- [x] Working app is deployed at a judge-accessible URL.
- [x] Full source, static assets, synthetic fixtures, and reproducible run/build instructions are included.
- [x] Root-level OSI-compatible `LICENSE` file is present (MIT).
- [x] WebMCP registration and the complete tool surface are documented.
- [x] Judge instructions explain supported browsers and require no private credentials.
- [x] Hackathon provenance is documented and supported by dated Git commits.
- [x] Submission copy addresses WebMCP fit, user experience, new human-agent capability, and implementation.
- [x] All documentation and proposed submission materials are in English.

### Owner actions required before submission

- [x] Make the GitHub repository public and confirm its About panel detects the MIT license.
- [ ] Add the live site URL (`https://nouploadmcp.app`) and a short description to the GitHub About panel.
- [ ] Record a demo shorter than three minutes, with audio, and upload it publicly to YouTube.
- [ ] Replace the video placeholder above with the final YouTube URL.
- [ ] Join the hackathon and complete every required Devpost field before September 3, 2026 at 1:00 PM PDT.
- [ ] Confirm entrant/team eligibility and appoint a representative if submitting as a team or organization.
- [ ] Verify the live URL and every demonstrated tool in ChatGPT's in-app browser immediately before submission.
- [ ] Keep the project freely accessible without restriction through the end of judging.
- [ ] Review screenshots/video for private data, third-party trademarks, copyrighted music, and unlicensed material.
- [ ] Save a draft early, then verify all URLs from a signed-out/private browser before final submission.

## Official references

- [WebMCP Challenge overview](https://webmcp.devpost.com/)
- [Official rules](https://webmcp.devpost.com/rules)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)

The official rules and Devpost notices are the source of truth. Re-check them immediately before submitting in case the organizer posts an update.
