import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

// Selected sample from https://www.trekcore.com/audio/toscomputer/tos_intercom_whistle.mp3.
// Redistribution permission for this recording has not been established.
const samplePath = fileURLToPath(new URL("./tos-intercom-whistle.mp3", import.meta.url));

type PlayerOptions = { platform?: string; spawn?: typeof spawn };
export class EnterpriseWhistlePlayer {
  private child: ChildProcess | undefined;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private pending = false;
  private cancelling = false;
  private muted = false;
  private closed = false;
  private unavailable = false;
  private readonly options: PlayerOptions;
  constructor(options: PlayerOptions = {}) { this.options = options; }
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancel();
  }
  request(): void {
    if (this.closed || this.muted || this.unavailable || (this.options.platform ?? process.platform) !== "darwin") return;
    if (this.child) { this.pending = true; return; }
    try {
      const child = (this.options.spawn ?? spawn)("/usr/bin/afplay", [samplePath], { stdio: "ignore", shell: false });
      this.child = child; this.cancelling = false;
      // A stuck host player cannot accumulate children; wait for close before reuse.
      this.timeout = setTimeout(() => { this.unavailable = true; this.pending = false; try { child.kill("SIGKILL"); } catch { /* Already gone. */ } }, 3000);
      this.timeout.unref?.();
      child.once("error", () => { this.unavailable = true; this.pending = false; });
      child.once("close", (code) => {
        if (this.child !== child) return;
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = undefined; this.child = undefined;
        if (code !== 0 && !this.cancelling) { this.unavailable = true; this.pending = false; }
        if (this.pending) { this.pending = false; this.request(); }
      });
    } catch { this.unavailable = true; this.pending = false; }
  }
  private cancel(): void {
    this.pending = false;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = undefined;
    this.cancelling = true;
    // Keep the child slot until close, including rapid mute/unmute sequences.
    try { this.child?.kill("SIGKILL"); } catch { /* Already gone. */ }
  }
  dispose(): void {
    this.closed = true; this.cancel();
  }
}
