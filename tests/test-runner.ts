#!/usr/bin/env -S deno run -A

/**
 * Test runner script for Fresh Scaffold application
 *
 * This script starts the Fresh development server, waits for it to be ready,
 * runs the E2E tests, and then cleans up the server process.
 */

import { delay } from "@std/async/delay";

const FRESH_DEV_PORT = 8000;
const SERVER_TIMEOUT = 30000; // 30 seconds

async function isServerReady(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(port: number, timeout: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await isServerReady(port)) {
      console.log("✅ Fresh server is ready");
      return;
    }
    await delay(1000);
    console.log("⏳ Waiting for server...");
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}

// Global reference for cleanup
let globalServerProcess: Deno.ChildProcess | null = null;

async function runTests(): Promise<void> {
  console.log("🚀 Starting Fresh Scaffold test suite");

  // Start the development server
  console.log("📦 Starting Fresh production server...");
  const serverProcess = new Deno.Command("deno", {
    args: ["task", "serve"],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  // Store reference for signal handlers
  globalServerProcess = serverProcess;

  let testsPassed = false;

  try {
    // Wait for server to be ready
    await waitForServer(FRESH_DEV_PORT, SERVER_TIMEOUT);

    // Run the E2E tests
    console.log("🧪 Running E2E tests...");
    const testProcess = new Deno.Command("deno", {
      args: ["task", "test:e2e"],
      stdout: "inherit",
      stderr: "inherit",
    });

    const testResult = await testProcess.output();

    if (testResult.success) {
      console.log("✅ All tests passed!");
      testsPassed = true;
    } else {
      console.log("❌ Some tests failed!");
    }
  } catch (error) {
    console.error(
      "❌ Error running tests:",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    // Robust cleanup of server process
    await cleanupServer(serverProcess);
    globalServerProcess = null;

    // Exit with appropriate code
    if (!testsPassed) {
      Deno.exit(1);
    }
  }
}

async function cleanupServer(serverProcess: Deno.ChildProcess): Promise<void> {
  console.log("🧹 Cleaning up server process...");

  try {
    // First, try graceful termination
    serverProcess.kill("SIGTERM");

    // Wait up to 5 seconds for graceful shutdown
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 5000);
    });

    const statusPromise = serverProcess.status.then(() => {
      console.log("✅ Server terminated gracefully");
    });

    await Promise.race([statusPromise, timeoutPromise]);

    // If process is still running, force kill it
    try {
      serverProcess.kill("SIGKILL");
      await serverProcess.status;
      console.log("🔨 Server force-killed");
    } catch {
      // Process already terminated
    }
  } catch (error) {
    console.warn(
      "⚠️  Warning during server cleanup:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Additional cleanup: kill any remaining deno processes on the port
  try {
    const killProcess = new Deno.Command("pkill", {
      args: ["-f", "deno task serve"],
      stdout: "piped",
      stderr: "piped",
    });
    await killProcess.output();
    console.log("🧹 Cleaned up any remaining processes");
  } catch {
    // Ignore errors - pkill might not find any processes
  }
}

if (import.meta.main) {
  // Set up signal handlers for cleanup
  const cleanup = async () => {
    if (globalServerProcess) {
      console.log("\n🛑 Received interrupt signal, cleaning up...");
      await cleanupServer(globalServerProcess);
    }
    Deno.exit(1);
  };

  // Handle Ctrl+C and other termination signals
  Deno.addSignalListener("SIGINT", cleanup);
  Deno.addSignalListener("SIGTERM", cleanup);

  try {
    await runTests();
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    if (globalServerProcess) {
      await cleanupServer(globalServerProcess);
    }
    Deno.exit(1);
  }
}
