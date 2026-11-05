// Optional task panel and MAIN-owned attention delivery. No background sound scan.
import { attentionIdentity, type AttentionDelivery } from "./lib/fm-panel-attention.ts";
import { EnterpriseWhistlePlayer } from "./lib/fm-enterprise-whistle.ts";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, watch, type FSWatcher } from "node:fs";
import { Markdown, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { quotaLines, quotaRows, selectedQuotaProviders, type QuotaRow } from "./lib/fm-panel-quota.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getMarkdownTheme, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { panelColor, TASK_PANEL_EVENT, type TaskPanel } from "./lib/fm-task-panel-composition.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const home = resolve(process.env.FM_HOME || process.env.FM_ROOT_OVERRIDE || root);
const state = resolve(home, "state");
const data = resolve(home, "data");
const script = resolve(root, "bin/fm-fleet-snapshot.sh");
const ATTENTION_ENTRY = "fm-attention-delivery";
const clean = (value: unknown): string => String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim();

type Row = { title: string; status: string };
function rowsFromSnapshot(input: any): Row[] {
  if (input?.schema !== "fm-fleet-local-tasks.v1" || resolve(input.fm_home || "") !== home || !Array.isArray(input.tasks)) throw new Error("invalid local snapshot");
  const rows: Row[] = [];
  for (const task of input.tasks) {
    const backlog = task.backlog;
    // Metadata, not a backlog-only row, owns direct-report inventory.
    if (backlog?.state === "done" || task.current_state?.state === "done") continue;
    if (task.kind === "secondmate" && !backlog && !task.hints?.open_decisions?.length) continue;
    const title = clean(backlog?.title) || "Untitled task";
    const current = clean(task.current_state?.state);
    const source = clean(task.current_state?.source);
    const event = clean(task.hints?.last_event_text).replace(/\s*\[[^\]]*\]/g, "");
    const reported = event.match(/^(working|paused|blocked|needs-decision|failed)\s*:/)?.[1];
    const decision = task.hints?.pending_decision;
    const blocked = task.hints?.blocked_event;
    let status = "⚪ unknown";
    if (decision) status = "❓ decision needed";
    else if (blocked) status = "⏳ blocked";
    else if (source === "run-step" || source === "pane") {
      const icon = current === "working" ? "🟢" : current === "failed" ? "🔴" : ["paused", "parked", "blocked"].includes(current) ? "⏳" : "⚪";
      status = `${icon} last seen ${current || "unknown"}`;
    } else if (reported) {
      const icon = reported === "failed" ? "🔴" : reported === "needs-decision" ? "❓" : ["paused", "blocked"].includes(reported) ? "⏳" : "⚪";
      status = `${icon} reported ${reported === "needs-decision" ? "decision" : reported}`;
    }
    rows.push({ title, status });
  }
  return rows;
}

export default function (pi: ExtensionAPI): void {
  let sound: EnterpriseWhistlePlayer | undefined, muted = false;
  let interactive = false;
  let enabled = false, narrow = false, page = 0, pending = false, closed = false;
  let rows: Row[] = [], quota: QuotaRow[] = [], error = "Loading", watchFailed = false, child: ChildProcess | undefined;
  let quotaChild: ChildProcess | undefined, quotaTimer: ReturnType<typeof setTimeout> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watchers: FSWatcher[] = [];
  let lastStart = 0;
  const panel: TaskPanel & { narrow: boolean } = {
    get narrow() { return narrow; },
    render(_width, height) {
      if (height <= 0) return [];
      const capacity = Math.max(1, height - 1);
      const blocks = rows.map(r => wrapTextWithAnsi(`${r.status}: ${r.title}`, Math.max(1, _width)));
      const pages: string[][] = [[]];
      for (const block of blocks) {
        for (const line of block) {
          if (pages[pages.length - 1].length >= capacity) pages.push([]);
          pages[pages.length - 1].push(line);
        }
      }
      page = Math.min(page, pages.length - 1);
      const header = `${panelColor(`TASKS ${rows.length} open`, "blue")} ${page + 1}/${pages.length}${error ? ` ${error}` : ""}`;
      return [header, ...pages[page]];
    },
    quota(_width) {
      const lines = [panelColor("QUOTA", "purple"), ...quotaLines(quota)];
      return lines.flatMap(line => wrapTextWithAnsi(line, Math.max(1, _width)));
    },
  };
  const publish = () => pi.events.emit(TASK_PANEL_EVENT, enabled && !closed ? panel : undefined);
  function refresh(): void {
    if (!enabled || closed) return;
    if (child) { pending = true; return; }
    lastStart = Date.now();
    let output = "", exceeded = false;
    child = spawn("bash", [script, "--local-tasks"], {
      env: { ...process.env, FM_HOME: home, FM_ROOT_OVERRIDE: root, FM_STATE_OVERRIDE: state, FM_DATA_OVERRIDE: data, FM_CONFIG_OVERRIDE: resolve(home, "config"), FM_PROJECTS_OVERRIDE: resolve(home, "projects"), FM_CREW_STATE_NO_FORGE: "1", FM_SNAPSHOT_CREW_STATE_TIMEOUT: "3" },
      detached: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const running = child;
    const killGroup = () => { try { if (running.pid) process.kill(-running.pid, "SIGTERM"); } catch { /* Already exited. */ } };
    const timeout = setTimeout(killGroup, 15000);
    timeout.unref?.();
    running.stdout?.on("data", (part: Buffer) => {
      output += part.toString("utf8");
      if (output.length > 2_000_000) { exceeded = true; killGroup(); }
    });
    running.on("error", () => { error = "unavailable"; publish(); });
    running.on("close", (code) => {
      clearTimeout(timeout);
      if (child !== running) return;
      child = undefined;
      if (!enabled || closed) return;
      try {
        if (code !== 0 || exceeded) throw new Error("snapshot failed");
        const snapshot = JSON.parse(output);
        rows = rowsFromSnapshot(snapshot);
        error = watchFailed ? "watch unavailable; refresh manually" : "";
      } catch { error = "unavailable"; }
      publish();
      if (pending) { pending = false; schedule(); }
    });
  }
  function schedule(): void {
    if (!enabled || closed || timer) return;
    const delay = Math.max(1000, 10000 - (Date.now() - lastStart));
    timer = setTimeout(() => { timer = undefined; refresh(); }, delay);
    timer.unref?.();
  }
  function refreshQuota(): void {
    if (!enabled || closed || quotaChild) return;
    let providers: string[] = [];
    let dispatch: unknown = null;
    try { dispatch = JSON.parse(readFileSync(resolve(home, "config/crew-dispatch.json"), "utf8")); } catch { /* Dispatch fallback is optional. */ }
    try { providers = selectedQuotaProviders(dispatch, resolve(home, "config")); } catch { /* No explicit provider. */ }
    if (!providers.length) { quota = []; publish(); return; }
    let output = "", exceeded = false;
    quota = []; publish();
    const running = spawn("quota-axi", ["--json", "--no-credential-refresh", "--max-age", "5m", "--provider", providers.join(",")], {detached: true, stdio:["ignore", "pipe", "ignore"]});
    quotaChild = running;
    const killQuota = () => { try { if (running.pid) process.kill(-running.pid, "SIGTERM"); } catch { /* Already exited. */ } };
    const timeout = setTimeout(killQuota, 15000); timeout.unref?.();
    running.stdout?.on("data", (part: Buffer) => { output += part.toString("utf8"); if (output.length > 2_000_000) { exceeded = true; killQuota(); } });
    running.on("error", () => { quota = []; publish(); });
    running.on("close", code => {
      clearTimeout(timeout);
      if (quotaChild !== running) return;
      quotaChild = undefined;
      if (!enabled || closed) return;
      try { quota = code === 0 && !exceeded ? quotaRows(JSON.parse(output), providers) : []; } catch { quota = []; }
      publish();
      quotaTimer = setTimeout(() => { quotaTimer = undefined; refreshQuota(); }, 300000); quotaTimer.unref?.();
    });
  }
  function stop(): void {
    enabled = false; pending = false;
    if (timer) clearTimeout(timer);
    if (quotaTimer) clearTimeout(quotaTimer);
    quotaTimer = undefined;
    if (quotaChild?.pid) { try { process.kill(-quotaChild.pid, "SIGTERM"); } catch { /* Already exited. */ } }
    quotaChild = undefined; quota = [];
    timer = undefined;
    for (const watcher of watchers.splice(0)) watcher.close();
    if (child?.pid) { try { process.kill(-child.pid, "SIGTERM"); } catch { /* Already exited. */ } }
    child = undefined;
    publish();
  }
  function start(): void {
    if (enabled) return;
    if (interactive && !sound) { sound = new EnterpriseWhistlePlayer(); sound.setMuted(muted); }
    enabled = true; error = "Loading"; watchFailed = false;
    for (const path of [state, data]) {
      try {
        const watcher = watch(path, (_event, filename) => {
          const name = filename?.toString() || "";
          if (!name || /\.(?:meta|status)$/.test(name) || name === "backlog.md") schedule();
        });
        watcher.on("error", () => { watchFailed = true; error = "watch unavailable; refresh manually"; publish(); });
        watchers.push(watcher);
      } catch { watchFailed = true; }
    }
    publish(); refresh(); refreshQuota();
  }
  pi.on("session_start", (_event, ctx) => {
    stop(); closed = false; interactive = ctx.mode === "tui"; muted = false;
    sound?.dispose(); sound = undefined;
    // The attention path must work even when the optional task panel is hidden.
    let enterprise = false;
    try { enterprise = /^enterprise(?:-cage|-phase2|-refit|-b)?$/.test(readFileSync(resolve(home, "config/calm-ship"), "utf8").trim()); }
    catch { /* Stock presentation keeps its existing silent default. */ }
    if (interactive && enterprise) sound = new EnterpriseWhistlePlayer();
  });
  pi.on("session_shutdown", () => { closed = true; stop(); sound?.dispose(); sound = undefined; });
  pi.registerEntryRenderer<AttentionDelivery>(ATTENTION_ENTRY, (entry) =>
    entry.data && attentionIdentity(entry.data) ? new Markdown(entry.data.message, 0, 0, getMarkdownTheme()) : undefined,
  );
  pi.registerTool({
    name: "fm_attention",
    label: "Deliver result or question",
    description: "Deliver a concrete user-facing question/approval, ready-to-view work, completed requested result, or important actionable failure as visible Markdown with the Enterprise attention sound when unmuted. MAIN owns this decision; worker status and branch processing alone do not request attention.",
    promptSnippet: "Deliver a new result, review, question or actionable failure to the user, with a deduplicated attention cue.",
    promptGuidelines: [
      "Use fm_attention for every newly delivered concrete user question/decision/approval, ready-to-view work/design/PR, completed user-requested deliverable (including healthy results), or important actionable failure. Put the complete user-facing Markdown in message; the tool displays it, so do not repeat it in your final reply.",
      "Routine progress, unchanged waits, internal intermediate reviewer results needing only your action, raw worker done events, and supervision processing requests are not attention. Handle them normally without fm_attention. Check current state before relaying old supervision outcomes; never notify for settled or replayed unresolved notices.",
      "Use a stable key for the specific task and matter, kind for its delivery purpose, and revision for the actual artifact revision or decision/failure episode. Reuse all three for retries or reworded reminders; change revision only for a genuinely new result or reopened matter. Distinct questions/results need distinct identities even while an old question remains open.",
    ],
    parameters: Type.Object({
      key: Type.String({ minLength: 1, maxLength: 300 }),
      revision: Type.String({ minLength: 1, maxLength: 300 }),
      kind: Type.Union([Type.Literal("question"), Type.Literal("review"), Type.Literal("completed"), Type.Literal("failure")]),
      message: Type.String({ minLength: 1 }),
    }),
    async execute(_id, args, _signal, _update, ctx) {
      const identity = attentionIdentity(args);
      if (!identity || closed) throw new Error("Attention requires a concrete identity and visible message in an active session.");
      // Persist the visible delivery itself, not a separate sound receipt. Reloads,
      // retries and branch navigation cannot replay an already delivered identity.
      const delivered = () => ctx.sessionManager.getEntries().some(entry =>
        entry.type === "custom" && entry.customType === ATTENTION_ENTRY && attentionIdentity(entry.data) === identity,
      );
      if (delivered()) return { content: [{ type: "text", text: "Already delivered; no repeated notice or sound." }], details: { delivered: false } };
      pi.appendEntry(ATTENTION_ENTRY, args);
      if (!delivered()) throw new Error("Visible attention delivery was not persisted; no sound requested.");
      sound?.request();
      return { content: [{ type: "text", text: "Delivered visibly. Do not repeat the message. Sound is best-effort and may be muted or unavailable." }], details: { delivered: true } };
    },
  });
  pi.registerCommand("fleet-panel", {
    description: "Show the local Enterprise task panel: on, off, next, prev, refresh, view (narrow), mute, or unmute (session-local).",
    handler: async (args, ctx) => {
      switch (args.trim()) {
        case "on": start(); break;
        case "mute": muted = true; sound?.setMuted(true); ctx.ui.notify("Fleet attention sound muted for this session.", "info"); break;
        case "unmute": muted = false; sound?.setMuted(false); ctx.ui.notify("Fleet attention sound enabled for new items.", "info"); break;
        case "off": stop(); break;
        case "next": page++; publish(); break;
        case "prev": page = Math.max(0, page - 1); publish(); break;
        case "refresh": refresh(); refreshQuota(); break;
        case "view": narrow = !narrow; publish(); break;
        default: ctx.ui.notify("Use /fleet-panel on|off|next|prev|refresh|view|mute|unmute", "info");
      }
    },
  });
}
