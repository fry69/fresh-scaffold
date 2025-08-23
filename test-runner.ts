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

async function runTests(): Promise<void> {
  console.log("🚀 Starting Fresh Scaffold test suite");

  // Start the development server
  console.log("📦 Starting Fresh development server...");
  const serverProcess = new Deno.Command("deno", {
    args: ["task", "dev"],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

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
    } else {
      console.log("❌ Some tests failed!");
      Deno.exit(1);
    }
  } catch (error) {
    console.error(
      "❌ Error running tests:",
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  } finally {
    // Clean up server process
    console.log("🧹 Cleaning up server process...");
    serverProcess.kill("SIGTERM");
    await serverProcess.status;
  }
}

if (import.meta.main) {
  await runTests();
}
