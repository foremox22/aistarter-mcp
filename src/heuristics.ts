import type { Answer, Architecture, Roadmap, Scope, SchemaDraft, Session } from "./types.js";

function findAnswer(answers: Answer[], id: string): string {
  return answers.find((a) => a.question_id === id)?.answer ?? "";
}

function mentionsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/** Best-effort guess at a structured scope from the raw interview answers. Meant to be refined, not trusted. */
export function draftScope(session: Session): Scope {
  const { answers } = session;
  const platformsText = findAnswer(answers, "platforms");
  const platforms: string[] = [];
  if (mentionsAny(platformsText, ["mobile", "app", "ios", "android"])) platforms.push("mobile");
  if (mentionsAny(platformsText, ["web", "website", "browser", "desktop"])) platforms.push("web");
  if (platforms.length === 0) platforms.push("web");

  return {
    one_liner: findAnswer(answers, "one_liner") || undefined,
    primary_users: findAnswer(answers, "primary_users") || undefined,
    platforms,
    needs_realtime: mentionsAny(findAnswer(answers, "realtime"), ["yes", "live", "instant", "real-time", "realtime"]),
    needs_accounts: !mentionsAny(findAnswer(answers, "accounts"), ["no", "none", "not needed"]),
    needs_payments: mentionsAny(findAnswer(answers, "payments"), ["yes", "pay", "order", "subscription", "checkout"]),
    needs_admin_dashboard: mentionsAny(findAnswer(answers, "admin_dashboard"), ["yes", "admin", "dashboard", "manage"]),
    estimated_scale: findAnswer(answers, "scale") || undefined,
    constraints: findAnswer(answers, "constraints") || undefined,
  };
}

/** Rule-based starting-point stack suggestion. The agent/human should confirm or override before finalizing. */
export function draftArchitecture(session: Session): Architecture {
  const scope = session.scope ?? {};
  const experience = session.classification?.experience_level ?? "some-experience";
  const isMobile = scope.platforms?.includes("mobile") ?? false;
  const needsRealtime = scope.needs_realtime ?? false;
  const isComplex = (scope.needs_payments && scope.needs_admin_dashboard) ?? false;
  const isBeginner = experience === "total-beginner";

  if (isMobile && isBeginner) {
    return {
      frontend: "React Native (Expo)",
      backend: "Firebase (Auth + Firestore + Cloud Functions)",
      database: "Firestore",
      hosting: "Firebase Hosting / EAS",
      rationale:
        "Expo keeps mobile setup simple for a first project, and Firebase bundles auth, a live database, and hosting so there's no separate backend to stand up.",
    };
  }

  if (needsRealtime && isBeginner) {
    return {
      frontend: "Next.js (React)",
      backend: "Firebase or Supabase",
      database: "Firestore / Supabase Postgres",
      hosting: "Vercel + Firebase/Supabase",
      rationale:
        "Both Firebase and Supabase give live-updating data out of the box, which avoids hand-rolling websockets for a first realtime feature.",
    };
  }

  if (isComplex && !isBeginner) {
    return {
      frontend: "Next.js (React) + TypeScript",
      backend: "Next.js API routes / a dedicated Node service",
      database: "Postgres (Supabase or Neon)",
      hosting: "Vercel",
      rationale:
        "Payments plus an admin dashboard benefit from a relational schema with real transactions and row-level security, which Postgres gives you directly.",
    };
  }

  return {
    frontend: "Next.js (React) + TypeScript",
    backend: "Next.js API routes",
    database: "Supabase Postgres",
    hosting: "Vercel",
    rationale:
      "A solid, well-documented default: one framework for frontend and backend, a managed Postgres database, and zero-config deploys.",
  };
}

const ARCHETYPE_TEMPLATES: Record<string, Array<{ name: string; fields: string[] }>> = {
  "ecommerce-ordering": [
    { name: "users", fields: ["id", "name", "role", "created_at"] },
    { name: "products", fields: ["id", "name", "price", "available"] },
    { name: "orders", fields: ["id", "user_id", "status", "items", "total", "created_at"] },
  ],
  marketplace: [
    { name: "users", fields: ["id", "name", "role", "created_at"] },
    { name: "listings", fields: ["id", "owner_id", "title", "price", "status"] },
    { name: "transactions", fields: ["id", "listing_id", "buyer_id", "seller_id", "status"] },
  ],
  "internal-dashboard": [
    { name: "users", fields: ["id", "name", "role", "created_at"] },
    { name: "records", fields: ["id", "type", "data", "updated_by", "updated_at"] },
  ],
  "generic-crud": [
    { name: "users", fields: ["id", "name", "role", "created_at"] },
    { name: "items", fields: ["id", "owner_id", "name", "data", "created_at"] },
  ],
};

function pickArchetype(scope: Scope): string {
  if (scope.needs_payments) return "ecommerce-ordering";
  if (scope.needs_admin_dashboard && !scope.needs_payments) return "internal-dashboard";
  if (mentionsAny(scope.one_liner ?? "", ["marketplace", "buy and sell", "listing"])) return "marketplace";
  return "generic-crud";
}

/** Baseline collections + a starting security note, picked from a small set of app archetypes. */
export function draftSchema(session: Session): SchemaDraft {
  const scope = session.scope ?? {};
  const archetype = pickArchetype(scope);
  const collections = ARCHETYPE_TEMPLATES[archetype] ?? ARCHETYPE_TEMPLATES["generic-crud"];
  return {
    archetype,
    collections,
    security_notes:
      "Default-deny everything. Every read/write rule (Firestore) or row policy (Postgres RLS) should check the caller's user id against an owner_id/user_id field before allowing access — never leave a collection or table open to any authenticated user by default.",
  };
}

/** Sprint breakdown sized to feature count and experience level. */
export function draftRoadmap(session: Session): Roadmap {
  const scope = session.scope ?? {};
  const experience = session.classification?.experience_level ?? "some-experience";
  const sprints: Roadmap["sprints"] = [
    { name: "Sprint 1: Foundation", goals: ["Project setup", "Auth (if needed)", "Deploy an empty shell to production"] },
    { name: "Sprint 2: Core flow", goals: ["Main data model", "The one core user flow end-to-end, ugly but working"] },
  ];
  if (scope.needs_realtime) {
    sprints.push({ name: "Sprint 3: Realtime", goals: ["Live updates for the core flow", "Loading/error states"] });
  }
  if (scope.needs_payments) {
    sprints.push({ name: `Sprint ${sprints.length + 1}: Payments`, goals: ["Payment provider integration", "Order/transaction states"] });
  }
  if (scope.needs_admin_dashboard) {
    sprints.push({ name: `Sprint ${sprints.length + 1}: Admin dashboard`, goals: ["Internal views", "Basic role-based access"] });
  }
  sprints.push({
    name: `Sprint ${sprints.length + 1}: Polish & launch`,
    goals:
      experience === "total-beginner"
        ? ["Fix rough edges", "Basic error handling", "Walk through the whole app once, end to end"]
        : ["Performance pass", "Edge cases", "Monitoring/logging", "Launch"],
  });
  return { sprints };
}
