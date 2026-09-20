#!/usr/bin/env node
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { listSessions, loadSession } from "../store.js";
import type { Session } from "../types.js";
import { escapeHtml, page } from "./html.js";
import { detectLocale, isLocale, questionText, t, type Locale } from "./i18n.js";

const PORT = Number(process.env.UI_PORT ?? 4870);
const APP_NAME = "Senior Dev in a Box";

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function stageBadge(stage: Session["stage"], locale: Locale): string {
  const keys: Record<Session["stage"], string> = {
    scoping: "stageScoping",
    ready_for_scope: "stageReadyForScope",
    architecture: "stageArchitecture",
    schema: "stageSchema",
    roadmap: "stageRoadmap",
    done: "stageDone",
  };
  return `<span class="badge">${escapeHtml(t(locale, keys[stage] ?? stage))}</span>`;
}

const EXP_KEYS: Record<string, string> = {
  "total-beginner": "expTotalBeginner",
  "some-experience": "expSomeExperience",
  experienced: "expExperienced",
};
const TOOL_KEYS: Record<string, string> = {
  "claude-code": "toolClaudeCode",
  codex: "toolCodex",
  cursor: "toolCursor",
  other: "toolOther",
};

function classificationLine(classification: Session["classification"], locale: Locale): string {
  if (!classification) return "";
  const exp = t(locale, EXP_KEYS[classification.experience_level] ?? classification.experience_level);
  const tool = t(locale, TOOL_KEYS[classification.ai_tool] ?? classification.ai_tool);
  return `${escapeHtml(exp)} · ${escapeHtml(tool)}`;
}

function projectTitle(session: Session, locale: Locale): string {
  return session.scope?.one_liner ?? session.answers.find((a) => a.question_id === "one_liner")?.answer ?? t(locale, "untitledProject");
}

async function renderList(locale: Locale): Promise<string> {
  const sessions = await listSessions();
  if (sessions.length === 0) {
    return `
      <h1>${APP_NAME}</h1>
      <p class="sub">${escapeHtml(t(locale, "listSub"))}</p>
      <p class="empty">${escapeHtml(t(locale, "emptyMessage"))}</p>`;
  }

  const cards = sessions
    .map((s) => {
      const title = projectTitle(s, locale);
      const when = new Date(s.updated_at).toLocaleString();
      const classification = classificationLine(s.classification, locale);
      return `
      <a class="card card-link" href="/session/${encodeURIComponent(s.session_id)}">
        <div class="row">
          <span class="title">${escapeHtml(title)}</span>
          ${stageBadge(s.stage, locale)}
        </div>
        <div class="meta">${classification}${classification ? " · " : ""}${escapeHtml(t(locale, "updated"))} ${escapeHtml(when)}</div>
      </a>`;
    })
    .join("\n");

  return `
    <h1>${APP_NAME}</h1>
    <p class="sub">${escapeHtml(t(locale, "listSub"))}</p>
    ${cards}`;
}

function renderScope(session: Session, locale: Locale): string {
  const scope = session.scope;
  if (!scope) return `<h2>${escapeHtml(t(locale, "sectionScope"))}</h2><p class="empty">${escapeHtml(t(locale, "notFinalized"))}</p>`;
  const yn = (v: boolean | undefined) => (v ? t(locale, "yes") : t(locale, "no"));
  const rows: string[] = [];
  if (scope.primary_users) rows.push(`<dt>${escapeHtml(t(locale, "primaryUsers"))}</dt><dd>${escapeHtml(scope.primary_users)}</dd>`);
  if (scope.platforms?.length) rows.push(`<dt>${escapeHtml(t(locale, "platforms"))}</dt><dd>${escapeHtml(scope.platforms.join(", "))}</dd>`);
  rows.push(`<dt>${escapeHtml(t(locale, "realtime"))}</dt><dd>${escapeHtml(yn(scope.needs_realtime))}</dd>`);
  rows.push(`<dt>${escapeHtml(t(locale, "accounts"))}</dt><dd>${escapeHtml(yn(scope.needs_accounts))}</dd>`);
  rows.push(`<dt>${escapeHtml(t(locale, "payments"))}</dt><dd>${escapeHtml(yn(scope.needs_payments))}</dd>`);
  rows.push(`<dt>${escapeHtml(t(locale, "adminDashboard"))}</dt><dd>${escapeHtml(yn(scope.needs_admin_dashboard))}</dd>`);
  if (scope.estimated_scale) rows.push(`<dt>${escapeHtml(t(locale, "scale"))}</dt><dd>${escapeHtml(scope.estimated_scale)}</dd>`);
  if (scope.constraints) rows.push(`<dt>${escapeHtml(t(locale, "constraints"))}</dt><dd>${escapeHtml(scope.constraints)}</dd>`);
  const features = scope.must_have_features?.length
    ? `<ul>${scope.must_have_features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "";
  return `
    <h2>${escapeHtml(t(locale, "sectionScope"))}</h2>
    <div class="card">
      ${scope.one_liner ? `<p><strong>${escapeHtml(scope.one_liner)}</strong></p>` : ""}
      <dl>${rows.join("\n")}</dl>
      ${features ? `<p class="meta" style="margin-top:12px">${escapeHtml(t(locale, "mustHaveFeatures"))}</p>${features}` : ""}
    </div>`;
}

function renderArchitecture(session: Session, locale: Locale): string {
  const arch = session.architecture;
  if (!arch) return `<h2>${escapeHtml(t(locale, "sectionArchitecture"))}</h2><p class="empty">${escapeHtml(t(locale, "notFinalized"))}</p>`;
  const rows = [
    arch.frontend ? `<dt>${escapeHtml(t(locale, "frontend"))}</dt><dd>${escapeHtml(arch.frontend)}</dd>` : "",
    arch.backend ? `<dt>${escapeHtml(t(locale, "backend"))}</dt><dd>${escapeHtml(arch.backend)}</dd>` : "",
    arch.database ? `<dt>${escapeHtml(t(locale, "database"))}</dt><dd>${escapeHtml(arch.database)}</dd>` : "",
    arch.hosting ? `<dt>${escapeHtml(t(locale, "hosting"))}</dt><dd>${escapeHtml(arch.hosting)}</dd>` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `
    <h2>${escapeHtml(t(locale, "sectionArchitecture"))}</h2>
    <div class="card">
      <dl>${rows}</dl>
      ${arch.rationale ? `<p class="meta" style="margin-top:12px">${escapeHtml(arch.rationale)}</p>` : ""}
    </div>`;
}

function renderSchema(session: Session, locale: Locale): string {
  const schema = session.schema;
  if (!schema) return `<h2>${escapeHtml(t(locale, "sectionSchema"))}</h2><p class="empty">${escapeHtml(t(locale, "notFinalized"))}</p>`;
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
    <h2>${escapeHtml(t(locale, "sectionSchema"))}</h2>
    <div class="card">
      ${schema.archetype ? `<p class="meta">${escapeHtml(t(locale, "archetype"))} ${escapeHtml(schema.archetype)}</p>` : ""}
      ${tables}
      ${schema.security_notes ? `<p class="meta" style="margin-top:12px">${escapeHtml(schema.security_notes)}</p>` : ""}
    </div>`;
}

function renderRoadmap(session: Session, locale: Locale): string {
  const roadmap = session.roadmap;
  if (!roadmap) return `<h2>${escapeHtml(t(locale, "sectionRoadmap"))}</h2><p class="empty">${escapeHtml(t(locale, "notFinalized"))}</p>`;
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
    <h2>${escapeHtml(t(locale, "sectionRoadmap"))}</h2>
    <div class="card">${sprints}</div>`;
}

function renderInterview(session: Session, locale: Locale): string {
  if (session.answers.length === 0) {
    return `<h2>${escapeHtml(t(locale, "sectionInterview"))}</h2><p class="empty">${escapeHtml(t(locale, "noAnswersYet"))}</p>`;
  }
  const qa = session.answers
    .map(
      (a) => `
      <div class="qa">
        <div class="q">${escapeHtml(questionText(locale, a.question_id))}</div>
        <div class="a">${escapeHtml(a.answer)}</div>
      </div>`
    )
    .join("\n");
  return `<h2>${escapeHtml(t(locale, "sectionInterview"))}</h2><div class="card">${qa}</div>`;
}

async function renderDetail(sessionId: string, locale: Locale): Promise<string | undefined> {
  const session = await loadSession(sessionId);
  if (!session) return undefined;

  const title = projectTitle(session, locale);
  const classification = classificationLine(session.classification, locale);

  return `
    <a class="back" href="/">&larr; ${escapeHtml(t(locale, "backLink"))}</a>
    <div class="row">
      <h1>${escapeHtml(title)}</h1>
      ${stageBadge(session.stage, locale)}
    </div>
    <p class="sub">${classification}${classification ? " · " : ""}${escapeHtml(t(locale, "started"))} ${escapeHtml(new Date(session.created_at).toLocaleString())}</p>
    ${renderInterview(session, locale)}
    ${renderScope(session, locale)}
    ${renderArchitecture(session, locale)}
    ${renderSchema(session, locale)}
    ${renderRoadmap(session, locale)}`;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const cookies = parseCookies(req.headers.cookie);
    const queryLang = url.searchParams.get("lang");

    let locale: Locale;
    const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8" };
    if (isLocale(queryLang)) {
      locale = queryLang;
      headers["Set-Cookie"] = `lang=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } else if (isLocale(cookies.lang)) {
      locale = cookies.lang;
    } else {
      locale = detectLocale(req.headers["accept-language"]);
    }

    if (url.pathname === "/") {
      const body = await renderList(locale);
      res.writeHead(200, headers);
      res.end(page(APP_NAME, body, locale));
      return;
    }

    const match = url.pathname.match(/^\/session\/([^/]+)$/);
    if (match) {
      const body = await renderDetail(decodeURIComponent(match[1]), locale);
      if (!body) {
        res.writeHead(404, headers);
        res.end(
          page(
            t(locale, "notFoundTitle"),
            `<p>${escapeHtml(t(locale, "notFoundMessage"))}</p><a href="/">&larr; ${escapeHtml(t(locale, "backLink"))}</a>`,
            locale
          )
        );
        return;
      }
      res.writeHead(200, headers);
      res.end(page(`${APP_NAME}`, body, locale));
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
