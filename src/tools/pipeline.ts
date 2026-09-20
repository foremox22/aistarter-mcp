import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { draftArchitecture, draftRoadmap, draftSchema, draftScope } from "../heuristics.js";
import { ArchitectureSchema, RoadmapSchema, SchemaDraftSchema, ScopeSchema } from "../schemas.js";
import { loadSession, saveSession } from "../store.js";
import { errorResult, jsonResult } from "../result.js";
import type { Session } from "../types.js";

const FINALIZE_HINT =
  "This is a draft, not a decision. Review it with the human, adjust anything that's wrong, then call again with finalize: true and the corrected data to lock it in.";

async function requireSession(session_id: string) {
  const session = await loadSession(session_id);
  if (!session) throw new Error(`No session found with id ${session_id}.`);
  return session;
}

export function registerPipelineTools(server: McpServer): void {
  server.registerTool(
    "evaluate_project_scope",
    {
      title: "Evaluate project scope",
      description:
        "Draft or finalize the project's scope. Without finalize, returns a heuristic guess at the scope from the interview answers. With finalize: true and data, stores the human-confirmed scope and advances the session.",
      inputSchema: {
        session_id: z.string(),
        finalize: z.boolean().optional(),
        data: ScopeSchema.optional(),
      },
    },
    async ({ session_id, finalize, data }) => {
      let session: Session;
      try {
        session = await requireSession(session_id);
      } catch (e) {
        return errorResult((e as Error).message);
      }
      if (session.stage === "scoping") {
        return errorResult("Finish the interview first (call answer_question) before evaluating scope.");
      }

      if (!finalize) {
        return jsonResult({ session_id, stage: session.stage, draft_scope: draftScope(session), hint: FINALIZE_HINT });
      }

      if (!data) return errorResult("finalize: true requires a data payload with the confirmed scope.");
      session.scope = data;
      if (session.stage === "ready_for_scope") session.stage = "architecture";
      await saveSession(session);
      return jsonResult({
        session_id,
        stage: session.stage,
        scope: session.scope,
        message: "Scope finalized. Call propose_architecture next.",
      });
    }
  );

  server.registerTool(
    "propose_architecture",
    {
      title: "Propose architecture",
      description:
        "Draft or finalize the tech stack. Without finalize, returns a rule-based suggestion (frontend/backend/database/hosting + rationale) based on the finalized scope and the human's experience level. With finalize: true and data, stores the chosen stack.",
      inputSchema: {
        session_id: z.string(),
        finalize: z.boolean().optional(),
        data: ArchitectureSchema.optional(),
      },
    },
    async ({ session_id, finalize, data }) => {
      let session: Session;
      try {
        session = await requireSession(session_id);
      } catch (e) {
        return errorResult((e as Error).message);
      }
      if (!session.scope) {
        return errorResult("Finalize the project scope first (evaluate_project_scope) before proposing an architecture.");
      }

      if (!finalize) {
        return jsonResult({ session_id, stage: session.stage, draft_architecture: draftArchitecture(session), hint: FINALIZE_HINT });
      }

      if (!data) return errorResult("finalize: true requires a data payload with the chosen architecture.");
      session.architecture = data;
      if (session.stage === "architecture") session.stage = "schema";
      await saveSession(session);
      return jsonResult({
        session_id,
        stage: session.stage,
        architecture: session.architecture,
        message: "Architecture finalized. Call generate_database_schema next.",
      });
    }
  );

  server.registerTool(
    "generate_database_schema",
    {
      title: "Generate database schema",
      description:
        "Draft or finalize a baseline database schema. Without finalize, returns starter collections/tables and a security-rules note picked from the scope. With finalize: true and data, stores the schema.",
      inputSchema: {
        session_id: z.string(),
        finalize: z.boolean().optional(),
        data: SchemaDraftSchema.optional(),
      },
    },
    async ({ session_id, finalize, data }) => {
      let session: Session;
      try {
        session = await requireSession(session_id);
      } catch (e) {
        return errorResult((e as Error).message);
      }
      if (!session.architecture) {
        return errorResult("Finalize the architecture first (propose_architecture) before generating a database schema.");
      }

      if (!finalize) {
        return jsonResult({ session_id, stage: session.stage, draft_schema: draftSchema(session), hint: FINALIZE_HINT });
      }

      if (!data) return errorResult("finalize: true requires a data payload with the confirmed schema.");
      session.schema = data;
      if (session.stage === "schema") session.stage = "roadmap";
      await saveSession(session);
      return jsonResult({
        session_id,
        stage: session.stage,
        schema: session.schema,
        message: "Schema finalized. Call generate_roadmap next.",
      });
    }
  );

  server.registerTool(
    "generate_roadmap",
    {
      title: "Generate roadmap",
      description:
        "Draft or finalize a sprint-by-sprint roadmap. Without finalize, returns a sprint breakdown sized to the feature set and experience level. With finalize: true and data, stores the roadmap and completes the session.",
      inputSchema: {
        session_id: z.string(),
        finalize: z.boolean().optional(),
        data: RoadmapSchema.optional(),
      },
    },
    async ({ session_id, finalize, data }) => {
      let session: Session;
      try {
        session = await requireSession(session_id);
      } catch (e) {
        return errorResult((e as Error).message);
      }
      if (!session.schema) {
        return errorResult("Finalize the database schema first (generate_database_schema) before generating a roadmap.");
      }

      if (!finalize) {
        return jsonResult({ session_id, stage: session.stage, draft_roadmap: draftRoadmap(session), hint: FINALIZE_HINT });
      }

      if (!data) return errorResult("finalize: true requires a data payload with the confirmed roadmap.");
      session.roadmap = data;
      if (session.stage === "roadmap") session.stage = "done";
      await saveSession(session);
      return jsonResult({
        session_id,
        stage: session.stage,
        roadmap: session.roadmap,
        message: "Roadmap finalized. The session is complete — start building sprint by sprint.",
      });
    }
  );
}
