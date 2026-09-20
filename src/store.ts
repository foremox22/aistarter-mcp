import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Session } from "./types.js";

const DATA_DIR = join(homedir(), ".aistarter-mcp", "sessions");

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(sessionId: string): string {
  return join(DATA_DIR, `${sessionId}.json`);
}

export async function createSession(
  classification: Session["classification"]
): Promise<Session> {
  await ensureDataDir();
  const now = new Date().toISOString();
  const session: Session = {
    session_id: randomUUID(),
    created_at: now,
    updated_at: now,
    stage: "scoping",
    classification,
    answers: [],
  };
  await writeFile(sessionPath(session.session_id), JSON.stringify(session, null, 2), "utf-8");
  return session;
}

export async function loadSession(sessionId: string): Promise<Session | undefined> {
  try {
    const raw = await readFile(sessionPath(sessionId), "utf-8");
    return JSON.parse(raw) as Session;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

export async function saveSession(session: Session): Promise<void> {
  session.updated_at = new Date().toISOString();
  await ensureDataDir();
  await writeFile(sessionPath(session.session_id), JSON.stringify(session, null, 2), "utf-8");
}

export async function listSessions(): Promise<Session[]> {
  await ensureDataDir();
  const files = await readdir(DATA_DIR);
  const sessions = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await readFile(join(DATA_DIR, f), "utf-8")) as Session)
  );
  return sessions.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
