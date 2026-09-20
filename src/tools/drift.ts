import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import { computeDrift, findUncoveredFeatures, parsePackageJsonDeps, parseProgressMd } from "../drift.js";
import { loadSession } from "../store.js";
import { errorResult, jsonResult } from "../result.js";

async function tryReadFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

export function registerDriftTools(server: McpServer): void {
  server.registerTool(
    "check_drift",
    {
      title: "Check drift from the plan",
      description:
        "Compare a project's actual state (PROGRESS.md checkboxes and package.json dependencies in target_dir) against the finalized scope and architecture from a session. Flags installed libraries that contradict the scope (e.g. a payment library when scope said no payments), stack pieces from the architecture that aren't installed yet, and planned features that don't appear in any roadmap sprint. Call this periodically during implementation, not just once at the start.",
      inputSchema: {
        session_id: z.string(),
        target_dir: z.string().describe("Absolute path to the project directory to inspect (should contain PROGRESS.md and/or package.json)."),
      },
    },
    async ({ session_id, target_dir }) => {
      const session = await loadSession(session_id);
      if (!session) return errorResult(`No session found with id ${session_id}.`);
      if (!session.scope) {
        return errorResult("Finalize the project scope first (evaluate_project_scope) — there's nothing to compare against yet.");
      }
      if (!isAbsolute(target_dir)) {
        return errorResult(`target_dir must be an absolute path. Got: ${target_dir}`);
      }

      const [progressText, pkgText] = await Promise.all([
        tryReadFile(join(target_dir, "PROGRESS.md")),
        tryReadFile(join(target_dir, "package.json")),
      ]);

      const progress = progressText ? parseProgressMd(progressText) : undefined;
      const deps = pkgText ? parsePackageJsonDeps(pkgText) : undefined;

      const findings = computeDrift(session, deps);
      const uncoveredFeatures = progress ? findUncoveredFeatures(session.scope, progress.allText) : [];

      const progressSummary = progress
        ? {
            sprints: progress.sprints.map((s) => ({ name: s.name, done: s.done, total: s.total })),
            overall: progress.sprints.reduce(
              (acc, s) => ({ done: acc.done + s.done, total: acc.total + s.total }),
              { done: 0, total: 0 }
            ),
          }
        : "PROGRESS.md not found in target_dir — run scaffold_project_docs first, or point target_dir at the right folder.";

      return jsonResult({
        target_dir,
        progress_summary: progressSummary,
        package_json: pkgText ? "found" : "not found — skipped dependency/stack checks",
        findings: findings.length > 0 ? findings : [{ type: "none", message: "No drift detected from the available signals." }],
        features_not_yet_in_roadmap: uncoveredFeatures,
        note: "Heuristic, best-effort signal from package.json + PROGRESS.md, same spirit as this server's other draft tools — review each finding with the human rather than trusting it blindly.",
      });
    }
  );
}
