import { assertEquals } from "@std/assert";
import { launch } from "jsr:@astral/astral";

const BASE_URL = "http://localhost:8000";

Deno.test({
  name: "Fresh Scaffold E2E Integration Test",
  // Set a reasonable timeout to prevent hanging tests
  sanitizeOps: false,
  sanitizeResources: false,
}, async (t) => {
  // Launch browser for testing
  // Use --no-sandbox flag in CI environments
  const isCI = Deno.env.get("CI") === "true" ||
    Deno.env.get("GITHUB_ACTIONS") === "true";
  const launchOptions = isCI
    ? { headless: true, args: ["--no-sandbox"] }
    : { headless: true };

  await using browser = await launch(launchOptions);
  await using page = await browser.newPage();

  await t.step("Should load the home page correctly", async () => {
    await page.goto(BASE_URL, { waitUntil: "networkidle0" });

    // Check page title
    const title = await page.evaluate(() => document.title);
    assertEquals(title, "3 Fresh Counters");

    // Check main heading
    const heading = await page.$("h1");
    const headingText = await heading!.innerText();
    assertEquals(headingText, "Welcome to Fresh");

    // Check that the Fresh logo is present
    const logo = await page.$('img[alt*="Fresh logo"]');
    assertEquals(logo !== null, true);

    // Check initial counter value
    const counterDisplay = await page.$(".text-3xl.tabular-nums");
    const counterText = await counterDisplay!.innerText();
    assertEquals(counterText, "3");
  });

  await t.step("Should increment counter and update page title", async () => {
    // Click increment button
    const incrementButton = await page.$("#increment");
    await incrementButton!.click();

    // Wait a bit for the signal to update
    await page.waitForTimeout(100);

    // Check counter display updated
    const counterDisplay = await page.$(".text-3xl.tabular-nums");
    const counterText = await counterDisplay!.innerText();
    assertEquals(counterText, "4");

    // Check page title updated
    const title = await page.evaluate(() => document.title);
    assertEquals(title, "4 Fresh Counters");
  });

  await t.step("Should decrement counter and update page title", async () => {
    // Click decrement button twice to go from 4 to 2
    const decrementButton = await page.$("#decrement");

    await decrementButton!.click();
    await page.waitForTimeout(100);
    await decrementButton!.click();
    await page.waitForTimeout(100);

    // Check counter display updated
    const counterDisplay = await page.$(".text-3xl.tabular-nums");
    const counterText = await counterDisplay!.innerText();
    assertEquals(counterText, "2");

    // Check page title updated
    const title = await page.evaluate(() => document.title);
    assertEquals(title, "2 Fresh Counters");
  });

  await t.step("Should handle singular counter correctly", async () => {
    // Decrement to 1
    const decrementButton = await page.$("#decrement");
    await decrementButton!.click();
    await page.waitForTimeout(100);

    // Check counter display
    const counterDisplay = await page.$(".text-3xl.tabular-nums");
    const counterText = await counterDisplay!.innerText();
    assertEquals(counterText, "1");

    // Check page title uses singular form
    const title = await page.evaluate(() => document.title);
    assertEquals(title, "1 Fresh Counter");
  });

  await t.step("Should not allow counter to go below 1", async () => {
    // Try to decrement below 1
    const decrementButton = await page.$("#decrement");
    await decrementButton!.click();
    await page.waitForTimeout(100);

    // Counter should still be 1
    const counterDisplay = await page.$(".text-3xl.tabular-nums");
    const counterText = await counterDisplay!.innerText();
    assertEquals(counterText, "1");

    // Page title should still be singular
    const title = await page.evaluate(() => document.title);
    assertEquals(title, "1 Fresh Counter");
  });

  await t.step("Should increment multiple times correctly", async () => {
    const incrementButton = await page.$("#increment");

    // Increment to 5
    for (let i = 0; i < 4; i++) {
      await incrementButton!.click();
      await page.waitForTimeout(50);
    }

    // Check final value
    const counterDisplay = await page.$(".text-3xl.tabular-nums");
    const counterText = await counterDisplay!.innerText();
    assertEquals(counterText, "5");

    // Check page title
    const title = await page.evaluate(() => document.title);
    assertEquals(title, "5 Fresh Counters");
  });

  await t.step(
    "Should have correct button styling and hover effects",
    async () => {
      const incrementButton = await page.$("#increment");

      // Check button classes
      const buttonClasses = await incrementButton!.getAttribute("class");
      assertEquals(buttonClasses?.includes("px-2"), true);
      assertEquals(buttonClasses?.includes("py-1"), true);
      assertEquals(buttonClasses?.includes("border-gray-500"), true);
      assertEquals(buttonClasses?.includes("border-2"), true);
      assertEquals(buttonClasses?.includes("rounded-sm"), true);

      // Check button text
      const buttonText = await incrementButton!.innerText();
      assertEquals(buttonText, "+1");

      const decrementButton = await page.$("#decrement");
      const decrementText = await decrementButton!.innerText();
      assertEquals(decrementText, "-1");
    },
  );

  await t.step("Should have correct page structure and content", async () => {
    // Check for the instruction paragraph
    const instructionP = await page.$("p");
    const instructionText = await instructionP!.innerText();
    assertEquals(instructionText.includes("Try updating this message"), true);
    assertEquals(instructionText.includes("./routes/index.tsx"), true);

    // Check for the code element
    const codeElement = await page.$("code");
    const codeText = await codeElement!.innerText();
    assertEquals(codeText, "./routes/index.tsx");

    // Check page has Fresh gradient class
    const bodyDiv = await page.$(".fresh-gradient");
    assertEquals(bodyDiv !== null, true);
  });

  await t.step("Should handle API route correctly", async () => {
    // Test the API route with different names
    const testCases = [
      { input: "john", expected: "Hello, John!" },
      { input: "alice", expected: "Hello, Alice!" },
      { input: "bob", expected: "Hello, Bob!" },
      { input: "MARY", expected: "Hello, MARY!" }, // Already uppercase
      { input: "123test", expected: "Hello, 123test!" }, // Starting with number
    ];

    for (const testCase of testCases) {
      const response = await page.evaluate((name) => {
        return fetch(`/api/${name}`).then((res) => res.text());
      }, { args: [testCase.input] });

      assertEquals(response, testCase.expected);
    }
  });

  await t.step("Should handle API route with special characters", async () => {
    // Test edge cases
    const edgeCases = [
      { input: "a", expected: "Hello, A!" }, // Single character
      { input: "test-name", expected: "Hello, Test-name!" }, // Hyphenated
      { input: "test_name", expected: "Hello, Test_name!" }, // Underscore
      { input: "123", expected: "Hello, 123!" }, // Numeric string
    ];

    for (const testCase of edgeCases) {
      const response = await page.evaluate((name) => {
        return fetch(`/api/${name}`).then((res) => res.text());
      }, { args: [testCase.input] });

      assertEquals(response, testCase.expected);
    }
  });
});
