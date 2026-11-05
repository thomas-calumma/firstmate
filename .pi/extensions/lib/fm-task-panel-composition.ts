import { getCapabilities, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";

export const TASK_PANEL_EVENT = "firstmate.task-panel.presentation.v1";
export type TaskPanel = { render(width: number, rows: number): string[]; quota?(width: number): string[]; narrow?: boolean };
type Accent = "blue" | "purple" | "orange";
export function panelColor(text: string, color: Accent): string {
  if (process.env.NO_COLOR !== undefined) return text;
  const rgb = {blue: "140;185;232", purple: "185;143;203", orange: "232;163;93"};
  const indexed = {blue: 110, purple: 140, orange: 215};
  const code = getCapabilities().trueColor ? `38;2;${rgb[color]}` : `38;5;${indexed[color]}`;
  return `\x1b[${code}m${text}\x1b[0m`;
}
function accent(lines: string[], width: number, color: Accent): string[] {
  if (width < 3) return lines.map(line => truncateToWidth(line, Math.max(0, width)));
  return lines.map(line => `${panelColor("▏", color)} ${truncateToWidth(line, width - 2)}`);
}
function join(left: string, leftWidth: number, right: string, rightWidth: number): string {
  const l = truncateToWidth(left, leftWidth);
  return `${l}${" ".repeat(Math.max(0, leftWidth - visibleWidth(l)))} ${truncateToWidth(right, rightWidth)}`;
}
// Kitty and Sixel escape sequences own their rows. Never concatenate text onto either image row.
export function composeTaskPanel(ship: Component, panel: TaskPanel, width: number, status = "Standing by"): string[] {
  width = Math.max(0, Math.floor(width));
  if (width === 0) return [];
  const inner = Math.max(0, width - 1);
  const title = truncateToWidth(` FIRSTMATE / ENTERPRISE · ${status} `, inner);
  const top = panelColor(`╭${title}${"━".repeat(Math.max(0, inner - visibleWidth(title)))}`, "orange");
  const frame = (lines: string[]) => lines.map(line => /\x1b(?:_G|P)/.test(line) ? line : `${panelColor("│", "orange")}${truncateToWidth(line, inner)}`);
  width = inner;
  if (width < 76) {
    const scene = ship.render(width);
    const tasks = accent(panel.render(Math.max(0, width - 2), 10), width, "blue");
    const quotas = accent(panel.quota?.(Math.max(0, width - 2)) ?? [], width, "purple");
    return [top, ...frame([...(panel.narrow ? [] : scene), ...tasks, ...quotas])];
  }
  const three = width >= 126;
  const left = three ? Math.max(48, Math.floor(width * .40)) : Math.min(78, Math.max(48, Math.floor(width * .53)));
  const rightSpace = width - left - 1;
  const taskWidth = three ? Math.floor((rightSpace - 1) * .56) : rightSpace;
  const quotaWidth = three ? rightSpace - taskWidth - 1 : rightSpace;
  const scene = ship.render(left);
  const image = scene.length > 3;
  const usable = image ? Math.max(0, scene.length - 2) : scene.length;
  const tasks = accent(panel.render(Math.max(0, taskWidth - 2), Math.max(usable, 8)), taskWidth, "blue");
  const quota = accent(panel.quota?.(Math.max(0, quotaWidth - 2)) ?? [], quotaWidth, "purple");
  const side = three ? Array.from({length: Math.max(tasks.length, quota.length)}, (_, i) => join(tasks[i] ?? "", taskWidth, quota[i] ?? "", quotaWidth)) : tasks;
  const result: string[] = [];
  for (let i = 0; i < scene.length; i++) {
    if (image && (i === 0 || i === scene.length - 1)) result.push(scene[i]);
    else result.push(join(scene[i], left, side[image ? i - 1 : i] ?? "", rightSpace));
  }
  for (let i = usable; i < side.length; i++) result.push(join("", left, side[i], rightSpace));
  if (!three && quota.length) result.push(...accent(panel.quota?.(Math.max(0, width - 2)) ?? [], width, "purple"));
  return [top, ...frame(result)];
}
