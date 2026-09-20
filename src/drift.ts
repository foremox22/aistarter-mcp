import type { Scope, Session } from "./types.js";

export interface SprintProgress {
  name: string;
  done: number;
  total: number;
}

export interface ProgressInfo {
  sprints: SprintProgress[];
  allText: string;
}

export function parseProgressMd(content: string): ProgressInfo {
  const lines = content.split(/\r?\n/);
  const sprints: SprintProgress[] = [];
  let current: SprintProgress | undefined;
  const textParts: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      current = { name: heading[1].trim(), done: 0, total: 0 };
      sprints.push(current);
      continue;
    }
    const item = line.match(/^-\s*\[([ xX])\]\s+(.*)$/);
    if (item && current) {
      current.total += 1;
      if (item[1].toLowerCase() === "x") current.done += 1;
      textParts.push(item[2]);
    }
  }

  return { sprints: sprints.filter((s) => s.total > 0), allText: textParts.join(" ").toLowerCase() };
}

export function parsePackageJsonDeps(content: string): Set<string> {
  try {
    const pkg = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  } catch {
    return new Set();
  }
}

const PAYMENT_LIBS = ["stripe", "@stripe/stripe-js", "@paypal/react-paypal-js", "square", "braintree"];
const AUTH_LIBS = [
  "next-auth",
  "@clerk/nextjs",
  "@clerk/clerk-react",
  "@auth0/nextjs-auth0",
  "passport",
  "@supabase/auth-helpers-nextjs",
  "@supabase/auth-helpers-react",
];
const REALTIME_LIBS = ["socket.io", "socket.io-client", "pusher-js", "pusher", "ably"];

export interface DriftFinding {
  type: "scope_drift" | "architecture_status";
  message: string;
}

export function computeDrift(session: Session, deps: Set<string> | undefined): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const scope = session.scope ?? {};
  const arch = session.architecture ?? {};

  if (deps) {
    const foundPayment = PAYMENT_LIBS.filter((l) => deps.has(l));
    if (scope.needs_payments === false && foundPayment.length > 0) {
      findings.push({
        type: "scope_drift",
        message: `Scope says no payments are needed, but a payment library is installed (${foundPayment.join(", ")}). Intentional, or did scope creep in?`,
      });
    }

    const foundAuth = AUTH_LIBS.filter((l) => deps.has(l));
    if (scope.needs_accounts === false && foundAuth.length > 0) {
      findings.push({
        type: "scope_drift",
        message: `Scope says no user accounts are needed, but an auth library is installed (${foundAuth.join(", ")}). Intentional, or did scope creep in?`,
      });
    }

    const foundRealtime = REALTIME_LIBS.filter((l) => deps.has(l));
    if (scope.needs_realtime === false && foundRealtime.length > 0) {
      findings.push({
        type: "scope_drift",
        message: `Scope says no realtime updates are needed, but a realtime library is installed (${foundRealtime.join(", ")}). Intentional, or did scope creep in?`,
      });
    }

    const frontend = (arch.frontend ?? "").toLowerCase();
    if (frontend.includes("expo") || frontend.includes("react native")) {
      if (!deps.has("expo") && !deps.has("react-native")) {
        findings.push({
          type: "architecture_status",
          message: `Architecture planned "${arch.frontend}", but neither "expo" nor "react-native" is in package.json yet (fine if the project shell just hasn't been set up).`,
        });
      }
    } else if (frontend.includes("next.js") || frontend.includes("nextjs")) {
      if (!deps.has("next")) {
        findings.push({
          type: "architecture_status",
          message: `Architecture planned "${arch.frontend}", but "next" isn't in package.json yet.`,
        });
      }
    }

    const database = (arch.database ?? "").toLowerCase();
    if (database.includes("firestore") || database.includes("firebase")) {
      if (!deps.has("firebase")) {
        findings.push({
          type: "architecture_status",
          message: `Architecture planned "${arch.database}", but "firebase" isn't in package.json yet.`,
        });
      }
    } else if (database.includes("supabase")) {
      if (!deps.has("@supabase/supabase-js")) {
        findings.push({
          type: "architecture_status",
          message: `Architecture planned "${arch.database}", but "@supabase/supabase-js" isn't in package.json yet.`,
        });
      }
    } else if (database.includes("postgres")) {
      if (!deps.has("pg") && !deps.has("postgres") && !deps.has("@supabase/supabase-js")) {
        findings.push({
          type: "architecture_status",
          message: `Architecture planned "${arch.database}", but no Postgres client library was found in package.json yet.`,
        });
      }
    }
  }

  return findings;
}

/** Scope must-have features that don't seem to be mentioned anywhere in the roadmap's sprint goals. */
export function findUncoveredFeatures(scope: Scope | undefined, progressAllText: string): string[] {
  if (!scope?.must_have_features?.length || !progressAllText) return [];
  return scope.must_have_features.filter((feature) => {
    const words = feature.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    return !words.some((w) => progressAllText.includes(w));
  });
}
