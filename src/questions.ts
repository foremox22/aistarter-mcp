export interface Question {
  id: string;
  text: string;
}

export const QUESTIONS: Question[] = [
  { id: "one_liner", text: "In one or two sentences, what do you want to build?" },
  { id: "primary_users", text: "Who are the primary users? (e.g. customers, staff, both)" },
  { id: "platforms", text: "Should this run on a mobile app, a website, or both?" },
  {
    id: "realtime",
    text: "Does anything need to update live/instantly for users (e.g. live order status, chat, notifications)?",
  },
  { id: "accounts", text: "Do users need to log in / have their own accounts?" },
  { id: "payments", text: "Will money change hands in the app (payments, orders, subscriptions)?" },
  {
    id: "admin_dashboard",
    text: "Do you (or staff) need a separate dashboard to manage things behind the scenes?",
  },
  {
    id: "scale",
    text: "Roughly how many users do you expect at launch — a handful, hundreds, or more?",
  },
  { id: "timeline", text: "Do you have a deadline or timeframe in mind?" },
  {
    id: "constraints",
    text: "Any tools, languages, or platforms you already know, want to use, or must avoid?",
  },
];

export function nextQuestion(answeredIds: string[]): Question | undefined {
  return QUESTIONS.find((q) => !answeredIds.includes(q.id));
}
