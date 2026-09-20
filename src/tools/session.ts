import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AiToolSchema, ExperienceLevelSchema } from "../schemas.js";
import { createSession, listSessions, loadSession, saveSession } from "../store.js";
import { nextQuestion, QUESTIONS } from "../questions.js";
import { errorResult, jsonResult } from "../result.js";

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    "start_session",
    {
      title: "Start a Senior Dev in a Box session",
      description:
        "Begin a new guided project session. Classifies the user (experience level, then which AI coding tool they're using) and returns the first interview question. Call this before anything else.",
      inputSchema: {
        experience_level: ExperienceLevelSchema.describe(
          "The human's coding experience: total-beginner, some-experience, or experienced."
        ),
        ai_tool: AiToolSchema.describe("Which AI coding tool/host the human is working in."),
      },
    },
    async ({ experience_level, ai_tool }) => {
      const session = await createSession({ experience_level, ai_tool });
      const question = nextQuestion([]);
      return jsonResult({
        session_id: session.session_id,
        stage: session.stage,
        next_question: question,
        message:
          "Ask the human this question, then call answer_question with their reply. Ask one question at a time — do not skip ahead.",
      });
    }
  );

  server.registerTool(
    "answer_question",
    {
      title: "Submit an interview answer",
      description:
        "Record the human's answer to the current interview question and get the next one. Once all questions are answered, the session moves to the scoping stage.",
      inputSchema: {
        session_id: z.string(),
        question_id: z.string().describe("The id of the question being answered."),
        answer: z.string().describe("The human's answer, in their own words."),
      },
    },
    async ({ session_id, question_id, answer }) => {
      const session = await loadSession(session_id);
      if (!session) return errorResult(`No session found with id ${session_id}.`);
      if (session.stage !== "scoping") {
        return errorResult(
          `This session's interview is already complete (stage: ${session.stage}). Call evaluate_project_scope instead.`
        );
      }
      if (!QUESTIONS.some((q) => q.id === question_id)) {
        return errorResult(`Unknown question_id "${question_id}".`);
      }

      const existing = session.answers.find((a) => a.question_id === question_id);
      if (existing) existing.answer = answer;
      else session.answers.push({ question_id, answer });

      const answeredIds = session.answers.map((a) => a.question_id);
      const next = nextQuestion(answeredIds);

      if (next) {
        await saveSession(session);
        return jsonResult({ session_id, stage: session.stage, next_question: next });
      }

      session.stage = "ready_for_scope";
      await saveSession(session);
      return jsonResult({
        session_id,
        stage: session.stage,
        message:
          "All interview questions answered. Call evaluate_project_scope (without finalize) to see a draft scope, then confirm/adjust it with the human before finalizing.",
      });
    }
  );

  server.registerTool(
    "get_session",
    {
      title: "Get session details",
      description: "Fetch the full state of a session: classification, interview answers, and any decisions made so far.",
      inputSchema: { session_id: z.string() },
    },
    async ({ session_id }) => {
      const session = await loadSession(session_id);
      if (!session) return errorResult(`No session found with id ${session_id}.`);
      return jsonResult(session);
    }
  );

  server.registerTool(
    "list_sessions",
    {
      title: "List sessions",
      description: "List every saved session (most recently updated first), so a session can be found again without remembering its id.",
      inputSchema: {},
    },
    async () => {
      const sessions = await listSessions();
      return jsonResult({
        sessions: sessions.map((s) => ({
          session_id: s.session_id,
          stage: s.stage,
          one_liner: s.scope?.one_liner ?? s.answers.find((a) => a.question_id === "one_liner")?.answer,
          updated_at: s.updated_at,
        })),
      });
    }
  );
}
