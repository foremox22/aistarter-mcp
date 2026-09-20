import type { Session } from "./types.js";

function fmtDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function buildProjectMd(session: Session): string {
  const scope = session.scope ?? {};
  const arch = session.architecture ?? {};
  const schema = session.schema ?? {};
  const classification = session.classification;

  const lines: string[] = [];
  lines.push(`# ${scope.one_liner ?? "Untitled project"}`);
  lines.push("");
  lines.push(`> Planned with aistarter-mcp (session \`${session.session_id}\`, ${fmtDate(session.created_at)}).`);
  lines.push("");
  lines.push("## What this is");
  lines.push("");
  lines.push(scope.one_liner ?? "_Not set._");
  if (scope.primary_users) lines.push(`\n**Primary users:** ${scope.primary_users}`);
  if (classification) lines.push(`\n**Built by:** ${classification.experience_level} developer, using ${classification.ai_tool}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push(`- Platforms: ${scope.platforms?.join(", ") ?? "TBD"}`);
  lines.push(`- Realtime updates needed: ${scope.needs_realtime ? "Yes" : "No"}`);
  lines.push(`- User accounts needed: ${scope.needs_accounts ? "Yes" : "No"}`);
  lines.push(`- Payments in-app: ${scope.needs_payments ? "Yes" : "No"}`);
  lines.push(`- Admin dashboard: ${scope.needs_admin_dashboard ? "Yes" : "No"}`);
  if (scope.estimated_scale) lines.push(`- Estimated scale: ${scope.estimated_scale}`);
  if (scope.constraints) lines.push(`- Constraints: ${scope.constraints}`);
  if (scope.must_have_features?.length) {
    lines.push("");
    lines.push("**Must-have features:**");
    for (const f of scope.must_have_features) lines.push(`- ${f}`);
  }
  lines.push("");
  lines.push("## Architecture");
  lines.push("");
  if (arch.frontend) lines.push(`- **Frontend:** ${arch.frontend}`);
  if (arch.backend) lines.push(`- **Backend:** ${arch.backend}`);
  if (arch.database) lines.push(`- **Database:** ${arch.database}`);
  if (arch.hosting) lines.push(`- **Hosting:** ${arch.hosting}`);
  if (arch.rationale) lines.push(`\n_Why:_ ${arch.rationale}`);
  if (!arch.frontend && !arch.backend && !arch.database && !arch.hosting) lines.push("_Not finalized yet._");
  lines.push("");
  lines.push("## Data model");
  lines.push("");
  if (schema.collections?.length) {
    for (const c of schema.collections) {
      lines.push(`- **${c.name}**: ${c.fields.join(", ")}`);
    }
    if (schema.security_notes) lines.push(`\n_Security:_ ${schema.security_notes}`);
  } else {
    lines.push("_Not finalized yet._");
  }
  lines.push("");
  lines.push("---");
  lines.push("See `PROGRESS.md` for the sprint plan, `ENVIRONMENT.md` for setup, and `BUGS_AND_FIXES.md` for the running issue log.");
  lines.push("");
  return lines.join("\n");
}

function environmentSetupChecklist(arch: Session["architecture"]): string[] {
  const text = `${arch?.frontend ?? ""} ${arch?.backend ?? ""} ${arch?.database ?? ""} ${arch?.hosting ?? ""}`.toLowerCase();
  const items: string[] = [];

  if (text.includes("expo") || text.includes("react native")) {
    items.push("Install Expo tooling and confirm the app runs on a simulator/device (`npx expo start`)");
  }
  if (text.includes("next.js") || text.includes("nextjs")) {
    items.push("Scaffold with `npx create-next-app@latest` (or confirm the existing app runs with `npm run dev`)");
  }
  if (text.includes("firestore") || text.includes("firebase")) {
    items.push("Create a Firebase project, enable Firestore, and (if needed) enable offline persistence");
    items.push("Add Firebase config/credentials to the app (do not commit them — use env vars / local config)");
  }
  if (text.includes("supabase")) {
    items.push("Create a Supabase project and grab the connection string / anon key");
  }
  if (text.includes("postgres") && !text.includes("supabase")) {
    items.push("Provision a Postgres database and record the connection string");
  }
  if (text.includes("vercel")) {
    items.push("`vercel link` the project, then `vercel deploy` for a first preview deploy");
  }
  if (text.includes("testflight") || text.includes("app store")) {
    items.push("Set up an Apple Developer account and a TestFlight build for distribution");
  }

  if (items.length === 0) {
    items.push("Install project dependencies");
    items.push("Verify the app runs locally");
  }
  items.push("Record any environment variables / secrets this project needs below (never commit real secrets)");
  return items;
}

export function buildEnvironmentMd(session: Session): string {
  const arch = session.architecture ?? {};
  const lines: string[] = [];
  lines.push(`# Environment — ${session.scope?.one_liner ?? "Untitled project"}`);
  lines.push("");
  lines.push("## Stack");
  lines.push("");
  lines.push(`- Frontend: ${arch.frontend ?? "TBD"}`);
  lines.push(`- Backend: ${arch.backend ?? "TBD"}`);
  lines.push(`- Database: ${arch.database ?? "TBD"}`);
  lines.push(`- Hosting: ${arch.hosting ?? "TBD"}`);
  lines.push("");
  lines.push("## Setup checklist");
  lines.push("");
  for (const item of environmentSetupChecklist(session.architecture)) {
    lines.push(`- [ ] ${item}`);
  }
  lines.push("");
  lines.push("## Environment variables");
  lines.push("");
  lines.push("| Name | Purpose | Where to get it |");
  lines.push("|---|---|---|");
  lines.push("| _(add as you go)_ | | |");
  lines.push("");
  lines.push("## How to run locally");
  lines.push("");
  lines.push("_(fill in once Sprint 1 stands up the project shell)_");
  lines.push("");
  return lines.join("\n");
}

export function buildProgressMd(session: Session): string {
  const roadmap = session.roadmap;
  const lines: string[] = [];
  lines.push(`# Progress — ${session.scope?.one_liner ?? "Untitled project"}`);
  lines.push("");
  lines.push(`Planned ${fmtDate(session.created_at)}. Check items off as they're actually done — this file is the source of truth for "where are we", not the plan itself.`);
  lines.push("");
  if (roadmap?.sprints?.length) {
    for (const sprint of roadmap.sprints) {
      lines.push(`## ${sprint.name}`);
      lines.push("");
      for (const goal of sprint.goals) lines.push(`- [ ] ${goal}`);
      lines.push("");
    }
  } else {
    lines.push("_No roadmap finalized yet — run generate_roadmap first._");
    lines.push("");
  }
  lines.push("## Notes");
  lines.push("");
  lines.push("_(running log of decisions/changes made while implementing, in reverse chronological order)_");
  lines.push("");
  return lines.join("\n");
}

export function buildBugsAndFixesMd(session: Session): string {
  return [
    `# Bugs & Fixes — ${session.scope?.one_liner ?? "Untitled project"}`,
    "",
    "Log real bugs here as they happen, newest first. Not a TODO list — only things that actually broke and how they got fixed, so the same mistake doesn't get re-debugged later.",
    "",
    "## Format",
    "",
    "```",
    "## YYYY-MM-DD — short title",
    "**Symptom:** what was observed",
    "**Root cause:** what was actually wrong",
    "**Fix:** what changed",
    "```",
    "",
    "---",
    "",
  ].join("\n");
}
