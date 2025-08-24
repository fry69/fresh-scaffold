#!/usr/bin/env -S deno run -A

/**
 * Flexible E2E runner for Fresh + Deno
 *
 * Modes:
 *  - Task mode (default): runs "deno task serve" then "deno task test:e2e"
 *  - Direct build+serve: set BUILD_CMD and SERVE_CMD (space-separated) to run build then serve directly
 *
 * Config via env vars:
 *  - BUILD_CMD (e.g. "deno run -A dev.ts build")
 *  - SERVE_CMD (e.g. "deno serve -A _fresh/server.js")
 *  - TASK_CMD (default "deno task serve")
 *  - TEST_CMD (default "deno task test:e2e")
 *  - FRESH_DEV_PORT (default 8000)
 *  - SERVER_TIMEOUT_MS (default 30000)
 *  - HEALTH_PATH (default "/")
 */

const env = (k: string, d = "") => Deno.env.get(k) ?? d;

const FRESH_DEV_PORT = Number(env("FRESH_DEV_PORT", "8000"));
const SERVER_TIMEOUT_MS = Number(env("SERVER_TIMEOUT_MS", "30000"));
const HEALTH_PATH = env("HEALTH_PATH", "/");

const BUILD_CMD_RAW = env("BUILD_CMD", "deno run -A dev.ts build").trim();
const SERVE_CMD_RAW = env("SERVE_CMD", "deno serve -A _fresh/server.js").trim();
const TASK_CMD_RAW = env("TASK_CMD", "");
const TEST_CMD_RAW = env("TEST_CMD", "deno task test:e2e");

function parseCmd(raw: string): string[] {
  // simple split on spaces — if you need quoted args, set mode to task and configure tasks
  return raw.split(/\s+/).filter(Boolean);
}

const directMode = Boolean(BUILD_CMD_RAW || SERVE_CMD_RAW);

const BUILD_CMD = BUILD_CMD_RAW ? parseCmd(BUILD_CMD_RAW) : undefined;
const SERVE_CMD = SERVE_CMD_RAW ? parseCmd(SERVE_CMD_RAW) : undefined;
const TASK_CMD = parseCmd(TASK_CMD_RAW);
const TEST_CMD = parseCmd(TEST_CMD_RAW);

function spawnChild(cmd: string[], inherit = true): Deno.ChildProcess {
  console.log(`> spawning: ${cmd.map((s) => (s.includes(" ") ? `"${s}"` : s)).join(" ")}`);
  return new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: inherit ? "inherit" : "piped",
    stderr: inherit ? "inherit" : "piped",
  }).spawn();
}

async function runCommandAndWait(cmd: string[]): Promise<Deno.CommandStatus> {
  const child = spawnChild(cmd, true);
  return await child.status;
}

async function isReady(port: number, path = "/"): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(port: number, timeoutMs: number, path = "/") {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    if (await isReady(port, path)) {
      console.log(`✅ server ready on port ${port}`);
      return;
    }
    const wait = Math.min(200 * Math.pow(1.25, attempt), 2000);
    await new Promise((r) => setTimeout(r, wait));
    attempt++;
    if (attempt % 5 === 0) console.log(`⏳ waiting for server (attempt ${attempt})...`);
  }
  throw new Error(`Server not ready after ${timeoutMs}ms`);
}

let serverChild: Deno.ChildProcess | null = null;
let cleaned = false;

async function cleanup(exitCode = 1) {
  if (cleaned) {
    Deno.exit(exitCode);
  }
  cleaned = true;

  if (serverChild) {
    try {
      console.log(`🛑 Stopping server (pid=${serverChild.pid}) with SIGTERM...`);
      try {
        serverChild.kill("SIGTERM");
      } catch {
        // ignore if already exited
      }

      // wait up to 5s for graceful shutdown
      await Promise.race([serverChild.status, new Promise((r) => setTimeout(r, 5000))]);

      // if still running, force kill by pid
      try {
        if (serverChild.pid) {
          // best-effort SIGKILL
          Deno.kill(serverChild.pid, "SIGKILL");
          // allow a tiny moment to let OS clean up
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch {
        // ignore
      }

      try {
        // await final status if not yet resolved
        await serverChild.status;
      } catch {
        // ignore
      }
      console.log("🧹 server cleanup done");
    } catch (err) {
      console.warn("⚠️ error during server cleanup:", err);
    }
  }

  Deno.exit(exitCode);
}

async function main() {
  console.log("🧭 E2E runner starting");
  console.log("Mode:", directMode ? "direct (build → serve)" : "task");

  try {
    if (directMode) {
      // run build if provided
      if (BUILD_CMD) {
        console.log("📦 Running build:", BUILD_CMD.join(" "));
        const res = await runCommandAndWait(BUILD_CMD);
        if (!res.success) {
          console.error("❌ Build failed:", res);
          return cleanup(1);
        }
        console.log("✅ Build succeeded");
      }

      if (!SERVE_CMD) {
        console.error("❌ SERVE_CMD not provided in direct mode");
        return cleanup(1);
      }

      // start server (inherit logs)
      serverChild = spawnChild(SERVE_CMD, true);
    } else {
      // task mode
      serverChild = spawnChild(TASK_CMD, true);
    }

    console.log(`📌 server pid: ${serverChild.pid}`);

    // install signal handlers (single cleanup call)
    const sigHandler = () => {
      console.log("\n✋ Received signal, cleaning up...");
      cleanup(1);
    };
    Deno.addSignalListener("SIGINT", sigHandler);
    Deno.addSignalListener("SIGTERM", sigHandler);

    // wait for server readiness
    try {
      await waitForServer(FRESH_DEV_PORT, SERVER_TIMEOUT_MS, HEALTH_PATH);
    } catch (err) {
      console.error("❌ Server did not become ready:", err instanceof Error ? err.message : err);
      return cleanup(1);
    }

    // run tests
    console.log("🧪 Running tests:", TEST_CMD.join(" "));
    const testChild = spawnChild(TEST_CMD, true);
    const testStatus = await testChild.status;

    if (testStatus.success) {
      console.log("✅ Tests passed");
      return cleanup(0);
    } else {
      console.error("❌ Tests failed");
      return cleanup(1);
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return cleanup(1);
  }
}

if (import.meta.main) {
  main();
}
