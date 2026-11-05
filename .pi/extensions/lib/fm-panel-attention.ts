// MAIN supplies semantic intent when it delivers the visible result. Neither
// worker status nor branch verdicts distinguish user attention from supervision.
export type AttentionDelivery = {
  key: string;
  revision: string;
  kind: "question" | "review" | "completed" | "failure";
  message: string;
};

export function attentionIdentity(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as AttentionDelivery;
  if (!["question", "review", "completed", "failure"].includes(item.kind) ||
      typeof item.key !== "string" || !item.key.trim() || item.key.length > 300 ||
      typeof item.revision !== "string" || !item.revision.trim() || item.revision.length > 300 ||
      typeof item.message !== "string" || !item.message.trim()) return undefined;
  return JSON.stringify([item.key.trim(), item.kind, item.revision.trim()]);
}
