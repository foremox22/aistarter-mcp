# AiStarterMCP — Senior Dev in a Box

An MCP server that acts as a senior-developer mentor for people just starting out with AI coding tools (Claude Code, Codex, Cursor, opencode, etc). Instead of jumping straight into code, it walks the human through a structured process before anything gets built:

1. **Classify** — experience level, then which AI tool they're using.
2. **Interview** — one question at a time about the project idea.
3. **Scope → Architecture → Database schema → Roadmap** — each stage gives a draft suggestion first, then locks in the human-confirmed decision before moving on.

The server enforces the *order* and *remembers* every decision (so a long project doesn't suffer from context amnesia). The actual reasoning — turning answers into a scope, picking a stack, designing a schema — is done by the calling AI agent together with the human; the server's heuristics are just a starting draft to react to.

## Install & register

Published on npm as [`aistarter-mcp`](https://www.npmjs.com/package/aistarter-mcp) — no clone or build needed, just Node.js. `npx` downloads and runs it on the fly.

Register with Claude Code:

```bash
claude mcp add aistarter -- npx -y aistarter-mcp
```

Register with Codex CLI (add to `~/.codex/config.toml`):

```toml
[mcp_servers.aistarter]
command = "npx"
args = ["-y", "aistarter-mcp"]
```

Register with Cursor (`.cursor/mcp.json` or global MCP settings):

```json
{
  "mcpServers": {
    "aistarter": { "command": "npx", "args": ["-y", "aistarter-mcp"] }
  }
}
```

Register with [opencode](https://opencode.ai) (`opencode.json`, project-level or `~/.config/opencode/opencode.json` for global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "aistarter": {
      "type": "local",
      "command": ["npx", "-y", "aistarter-mcp"],
      "enabled": true
    }
  }
}
```

### Building from source instead

```bash
git clone <this repo>
cd aistarter-mcp
npm install
npm run build
claude mcp add aistarter -- node "/absolute/path/to/aistarter-mcp/dist/index.js"
```

## Tools

| Tool | Purpose |
|---|---|
| `start_session` | Classify the user (experience level + AI tool) and get the first interview question. |
| `answer_question` | Submit an answer, get the next question. |
| `get_session` | Inspect a session's full state at any point. |
| `list_sessions` | Find a session again without remembering its id. |
| `evaluate_project_scope` | Draft/finalize the project scope. |
| `propose_architecture` | Draft/finalize the tech stack. |
| `generate_database_schema` | Draft/finalize a baseline schema + security notes. |
| `generate_roadmap` | Draft/finalize a sprint-by-sprint roadmap. |
| `scaffold_project_docs` | Write `PROJECT.md`, `ENVIRONMENT.md`, `PROGRESS.md`, `BUGS_AND_FIXES.md` into a target project folder, filled in from the finished session. |
| `check_drift` | Compare a project's actual `package.json`/`PROGRESS.md` against the finalized scope/architecture and flag mismatches. Call this periodically during implementation. |

Each pipeline tool (scope/architecture/schema/roadmap) works the same way: call it without `finalize` to get a heuristic draft, review/adjust it with the human, then call it again with `finalize: true` and the corrected `data` to lock it in and move to the next stage. Calling a stage before the previous one is finalized returns a clear error instead of silently proceeding.

Session data is stored locally at `~/.aistarter-mcp/sessions/<id>.json`.

## Starting to implement

Once a session's roadmap is finalized (`stage: "done"`), call `scaffold_project_docs` with the session id and the folder you're about to build the project in. It writes four files there:

- **PROJECT.md** — the plan: one-liner, scope, architecture, data model. Reference material, not meant to be edited during implementation.
- **ENVIRONMENT.md** — the chosen stack plus a setup checklist (heuristically derived from the architecture text) and a table to fill in as env vars get added.
- **PROGRESS.md** — the roadmap's sprints as a checkbox list. This is the file to check items off in as work actually happens.
- **BUGS_AND_FIXES.md** — an empty log, ready to append real bugs (symptom/root cause/fix) to as they come up.

By default it won't overwrite any of these 4 files if they already exist in `target_dir` (pass `overwrite: true` to force it) — so re-running it after you've started editing PROGRESS.md by hand is safe.

## Staying on track while implementing

Call `check_drift` (same `session_id` + `target_dir`) any time during implementation — not just once. It reads `PROGRESS.md` and `package.json` from `target_dir` and flags:

- A library installed that contradicts the scope (e.g. a payment SDK when scope said no payments needed) — possible scope creep.
- A piece of the planned architecture that isn't in `package.json` yet — informational if you just haven't gotten there, worth a second look if you have.
- A `must_have_feature` from scope that doesn't appear to be covered by any roadmap sprint in `PROGRESS.md`.

Like the pipeline tools' drafts, these are heuristic signals to react to, not verdicts — review each finding rather than trusting it blindly.

## Viewing your sessions (UI)

A small local, read-only web viewer lists every session you've interviewed through and lets you drill into one to see the full interview, scope, architecture, schema, and roadmap:

```bash
npx -y aistarter-mcp-ui
```

Opens `http://127.0.0.1:4870` (binds to localhost only) and tries to launch your browser automatically. Override the port with `UI_PORT=4871 npx -y aistarter-mcp-ui`. (Building from source: `npm run ui` instead.)
