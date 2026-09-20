import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import { buildBugsAndFixesMd, buildEnvironmentMd, buildProgressMd, buildProjectMd } from "../docTemplates.js";
import { loadSession } from "../store.js";
import { errorResult, jsonResult } from "../result.js";
import type { Session } from "../types.js";

const FILES: Array<{ name: string; build: (session: Session) => string }> = [
  { name: "PROJECT.md", build: buildProjectMd },
  { name: "ENVIRONMENT.md", build: buildEnvironmentMd },
  { name: "PROGRESS.md", build: buildProgressMd },
  { name: "BUGS_AND_FIXES.md", build: buildBugsAndFixesMd },
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function registerScaffoldTools(server: McpServer): void {
  server.registerTool(
    "scaffold_project_docs",
    {
      title: "Scaffold project tracking docs",
      description:
        "Write PROJECT.md, ENVIRONMENT.md, PROGRESS.md, and BUGS_AND_FIXES.md into a target project directory, filled in from a finished session's scope/architecture/schema/roadmap. Call this once, right after generate_roadmap finalizes, at the point where the human is about to start actually implementing the project.",
      inputSchema: {
        session_id: z.string(),
        target_dir: z.string().describe("Absolute path to the project directory the docs should be written into. Created if it doesn't exist."),
        overwrite: z.boolean().optional().describe("If true, overwrite any of the 4 files that already exist. Default false (existing files are left untouched)."),
      },
    },
    async ({ session_id, target_dir, overwrite }) => {
      const session = await loadSession(session_id);
      if (!session) return errorResult(`No session found with id ${session_id}.`);
      if (session.stage !== "done") {
        return errorResult(
          `This session isn't finished yet (stage: ${session.stage}). Finish evaluate_project_scope, propose_architecture, generate_database_schema, and generate_roadmap (all finalized) before scaffolding docs.`
        );
      }
      if (!isAbsolute(target_dir)) {
        return errorResult(`target_dir must be an absolute path. Got: ${target_dir}`);
      }

      await mkdir(target_dir, { recursive: true });

      const results: Array<{ file: string; status: "written" | "skipped_exists" }> = [];
      for (const { name, build } of FILES) {
        const path = join(target_dir, name);
        if (!overwrite && (await fileExists(path))) {
          results.push({ file: path, status: "skipped_exists" });
          continue;
        }
        await writeFile(path, build(session), "utf-8");
        results.push({ file: path, status: "written" });
      }

      return jsonResult({
        target_dir,
        files: results,
        message:
          "Docs scaffolded. PROJECT.md and ENVIRONMENT.md capture the plan; PROGRESS.md and BUGS_AND_FIXES.md are meant to be edited directly as implementation proceeds — they aren't synced back to the MCP session.",
      });
    }
  );
}
