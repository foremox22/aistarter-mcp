#!/usr/bin/env node
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { listSessions, loadSession } from "../store.js";
import { QUESTIONS } from "../questions.js";
import type { Session } from "../types.js";
import { escapeHtml, page } from "./html.js";

const PORT = Number(process.env.UI_PORT ?? 4870);

function stageBadge(stage: Session["stage"]): string {
  const labels: Record<Session["stage"], string> = {
    scoping: "Interviewing",
    ready_for_scope: "Ready for scope",
    architecture: "Scoping architecture",
    schema: "Designing schema",
    roadmap: "Building roadmap",
    done: "Done",
  };
  return `<span class="badge">${escapeHtml(labels[stage] ?? stage)}</span>`;
}

function questionText(id: string): string {
  return QUESTIONS.find((q) => q.id === id)?.text ?? id;
}

async function renderList(): Promise<string> {
  const sessions = await listSessions();
  if (sessions.length === 0) {
    return `
      <h1>Senior Dev in a Box — sessions</h1>
      <p class="sub">Every project you've interviewed through the aistarter MCP shows up here.</p>
      <p class="empty">No sessions yet. Start one by talking to your AI agent — it will call start_session for you.</p>`;
  }

  const cards = sessions
    .map((s) => {
      const title = s.scope?.one_liner ?? s.answers.find((a) => a.question_id === "one_liner")?.answer ?? "Untitled project";
      const when = new Date(s.updated_at).toLocaleString();
      const classification = s.classification
        ? `${escapeHtml(s.classification.experience_level)} · ${escapeHtml(s.classification.ai_tool)}`
        : "";
      return `
      <a class="card card-link" href="/session/${encodeURIComponent(s.session_id)}">
        <div class="row">
          <span class="title">${escapeHtml(title)}</span>
          ${stageBadge(s.stage)}
        </div>
        <div class="meta">${classification}${classification ? " · " : ""}updated ${escapeHtml(when)}</div>
      </a>`;
    })
    .join("\n");

  return `
    <h1>Senior Dev in a Box — sessions</h1>
    <p class="sub">Every project you've interviewed through the aistarter MCP.</p>
    ${cards}`;
}

function renderScope(session: Session): string {
  const scope = session.scope;
  if (!scope) return `<h2>Scope</h2><p class="empty">Not finalized yet.</p>`;
  const rows: string[] = [];
  if (scope.primary_users) rows.push(`<dt>Primary users</dt><dd>${escapeHtml(scope.primary_users)}</dd>`);
  if (scope.platforms?.length) rows.push(`<dt>Platforms</dt><dd>${escapeHtml(scope.platforms.join(", "))}</dd>`);
  rows.push(`<dt>Realtime</dt><dd>${scope.needs_realtime ? "Yes" : "No"}</dd>`);
  rows.push(`<dt>Accounts</dt><dd>${scope.needs_accounts ? "Yes" : "No"}</dd>`);
  rows.push(`<dt>Payments</dt><dd>${scope.needs_payments ? "Yes" : "No"}</dd>`);
  rows.push(`<dt>Admin dashboard</dt><dd>${scope.needs_admin_dashboard ? "Yes" : "No"}</dd>`);
  if (scope.estimated_scale) rows.push(`<dt>Scale</dt><dd>${escapeHtml(scope.estimated_scale)}</dd>`);
  if (scope.constraints) rows.push(`<dt>Constraints</dt><dd>${escapeHtml(scope.constraints)}</dd>`);
  const features = scope.must_have_features?.length
    ? `<ul>${scope.must_have_features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "";
  return `
    <h2>Scope</h2>
    <div class="card">
      ${scope.one_liner ? `<p><strong>${escapeHtml(scope.one_liner)}</strong></p>` : ""}
      <dl>${rows.join("\n")}</dl>
      ${features ? `<p class="meta" style="margin-top:12px">Must-have features</p>${features}` : ""}
    </div>`;
}

function renderArchitecture(session: Session): string {
  const arch = session.architecture;
  if (!arch) return `<h2>Architecture</h2><p class="empty">Not finalized yet.</p>`;
  const rows = [
    arch.frontend ? `<dt>Frontend</dt><dd>${escapeHtml(arch.frontend)}</dd>` : "",
    arch.backend ? `<dt>Backend</dt><dd>${escapeHtml(arch.backend)}</dd>` : "",
    arch.database ? `<dt>Database</dt><dd>${escapeHtml(arch.database)}</dd>` : "",
    arch.hosting ? `<dt>Hosting</dt><dd>${escapeHtml(arch.hosting)}</dd>` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `
    <h2>Architecture</h2>
    <div class="card">
      <dl>${rows}</dl>
      ${arch.rationale ? `<p class="meta" style="margin-top:12px">${escapeHtml(arch.rationale)}</p>` : ""}
    </div>`;
}

function renderSchema(session: Session): string {
  const schema = session.schema;
  if (!schema) return `<h2>Database schema</h2><p class="empty">Not finalized yet.</p>`;
  const tables = (schema.collections ?? [])
    .map(
      (c) => `
      <table>
        <thead><tr><th colspan="1">${escapeHtml(c.name)}</th></tr></thead>
        <tbody>${c.fields.map((f) => `<tr><td>${escapeHtml(f)}</td></tr>`).join("")}</tbody>
      </table>`
    )
    .join("\n");
  return `
    <h2>Database schema</h2>
    <div class="card">
      ${schema.archetype ? `<p class="meta">Archetype: ${escapeHtml(schema.archetype)}</p>` : ""}
      ${tables}
      ${schema.security_notes ? `<p class="meta" style="margin-top:12px">${escapeHtml(schema.security_notes)}</p>` : ""}
    </div>`;
}

function renderRoadmap(session: Session): string {
  const roadmap = session.roadmap;
  if (!roadmap) return `<h2>Roadmap</h2><p class="empty">Not finalized yet.</p>`;
  const sprints = (roadmap.sprints ?? [])
    .map(
      (s) => `
      <div class="sprint">
        <div class="sprint-name">${escapeHtml(s.name)}</div>
        <ul>${s.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>
      </div>`
    )
    .join("\n");
  return `
    <h2>Roadmap</h2>
    <div class="card">${sprints}</div>`;
}

function renderInterview(session: Session): string {
  if (session.answers.length === 0) return `<h2>Interview</h2><p class="empty">No answers recorded yet.</p>`;
  const qa = session.answers
    .map(
      (a) => `
      <div class="qa">
        <div class="q">${escapeHtml(questionText(a.question_id))}</div>
        <div class="a">${escapeHtml(a.answer)}</div>
      </div>`
    )
    .join("\n");
  return `<h2>Interview</h2><div class="card">${qa}</div>`;
}

async function renderDetail(sessionId: string): Promise<string | undefined> {
  const session = await loadSession(sessionId);
  if (!session) return undefined;

  const title = session.scope?.one_liner ?? session.answers.find((a) => a.question_id === "one_liner")?.answer ?? "Untitled project";
  const classification = session.classification
    ? `${escapeHtml(session.classification.experience_level)} · ${escapeHtml(session.classification.ai_tool)}`
    : "";

  return `
    <a class="back" href="/">&larr; All sessions</a>
    <div class="row">
      <h1>${escapeHtml(title)}</h1>
      ${stageBadge(session.stage)}
    </div>
    <p class="sub">${classification}${classification ? " · " : ""}started ${escapeHtml(new Date(session.created_at).toLocaleString())}</p>
    ${renderInterview(session)}
    ${renderScope(session)}
    ${renderArchitecture(session)}
    ${renderSchema(session)}
    ${renderRoadmap(session)}`;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

    if (url.pathname === "/") {
      const body = await renderList();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(page("Senior Dev in a Box", body));
      return;
    }

    const match = url.pathname.match(/^\/session\/([^/]+)$/);
    if (match) {
      const body = await renderDetail(decodeURIComponent(match[1]));
      if (!body) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(page("Not found", `<p>No session with that id.</p><a href="/">&larr; All sessions</a>`));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(page("Session — Senior Dev in a Box", body));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Internal error: ${(err as Error).message}`);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`aistarter-mcp UI running at ${url}`);
  if (process.platform === "win32") {
    exec(`start "" "${url}"`, () => {});
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`, () => {});
  } else {
    exec(`xdg-open "${url}"`, () => {});
  }
});
