import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Only an explicitly configured provider is eligible; Muse's quota read creates a key.
const ALLOWED = new Set(["codex", "claude", "cursor", "copilot", "grok", "kimi", "zai", "agy", "alibaba", "opencode-go", "commandcode", "minimax", "mimo", "deepseek", "openrouter", "elevenlabs", "devin", "higgsfield"]);
const WINDOW_KINDS = ["weekly", "session", "monthly"] as const;
type WindowKind = typeof WINDOW_KINDS[number];
export type QuotaRow = { provider: string; kind?: WindowKind; remaining?: number; resetAt?: number };
export function selectedQuotaProviders(config: unknown, configDir?: string): string[] {
  if (configDir !== undefined) {
    try {
      const explicit = readFileSync(resolve(configDir, "quota-panel-providers"), "utf8");
      return [...new Set(explicit.split(/\r?\n/).map(line => line.trim()).filter(name => name && ALLOWED.has(name)))].slice(0, 2);
    } catch (error) {
      if ((error as {code?: unknown})?.code !== "ENOENT") return [];
    }
  }
  const provider = (config as {default?: {provider?: unknown}} | null)?.default?.provider;
  return typeof provider === "string" && ALLOWED.has(provider) ? [provider] : [];
}
export function resetDuration(resetAt: number | undefined, now = Date.now()): string | undefined {
  if (resetAt === undefined || !Number.isFinite(resetAt) || resetAt <= now) return undefined;
  const minutes = Math.ceil((resetAt - now) / 60000);
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), mins = minutes % 60;
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? "" : "s"}`;
  const parts = days ? [unit(days, "day"), ...(hours ? [unit(hours, "hour")] : [])]
    : hours ? [unit(hours, "hour"), ...(mins ? [unit(mins, "minute")] : [])] : [unit(mins, "minute")];
  return `in ${parts.join(", ")}`;
}
export function quotaRows(snapshot: unknown, selected: string[]): QuotaRow[] {
  const input = snapshot as {schemaVersion?: unknown; providers?: unknown};
  if (![5, 6].includes(Number(input?.schemaVersion)) || !Array.isArray(input?.providers)) return [];
  const result: QuotaRow[] = [];
  for (const name of selected.slice(0, 2)) {
    if (!ALLOWED.has(name)) continue;
    const matches = input.providers.filter((p: any) => p?.provider === name && p?.notSetUp !== true && !["unusable", "expired_refreshable"].includes(p?.state?.authStatus) && (p?.state?.authStatus === "usable" || (p?.state?.status === "fresh" && p?.state?.stale === false)));
    if (matches.length !== 1) continue;
    const p = matches[0];
    const windows = Array.isArray(p.windows) ? p.windows.filter((w: any) => WINDOW_KINDS.includes(w?.kind) && w?.shareOf === undefined) : [];
    const kinds = WINDOW_KINDS.filter(kind => windows.some((w: any) => w.kind === kind));
    if (!kinds.length) { result.push({provider: name}); continue; }
    for (const kind of kinds) {
      const matching = windows.filter((w: any) => w.kind === kind);
      const row: QuotaRow = {provider: name, kind};
      if (p.state.status === "fresh" && p.state.stale === false && matching.length === 1) {
        const w = matching[0];
        if (typeof w.percentRemaining === "number" && Number.isFinite(w.percentRemaining) && w.percentRemaining >= 0 && w.percentRemaining <= 100) row.remaining = w.percentRemaining;
        if (typeof w.resetsAt === "string" && Number.isFinite(Date.parse(w.resetsAt))) row.resetAt = Date.parse(w.resetsAt);
      }
      result.push(row);
    }
  }
  return result;
}
export function quotaLines(rows: QuotaRow[]): string[] {
  if (!rows.length) return ["Quota unavailable"];
  return rows.flatMap(q => {
    const label = `${q.provider}${q.kind ? ` ${q.kind}` : ""}`;
    return [`${label}: ${q.remaining === undefined ? "unknown" : `${q.remaining}% left`}`, `Reset: ${resetDuration(q.resetAt) ?? "unavailable"}`];
  });
}
