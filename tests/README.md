# Tests

This directory contains end-to-end integration tests for the Fresh Scaffold
application using Astral browser automation.

## Prerequisites

Before running the tests, make sure you have:

1. The Fresh application running locally on `http://localhost:8000`
2. Deno installed (Astral dependencies are handled automatically)

## Running Tests

### Start the development server

First, start the Fresh development server:

```bash
deno task dev
```

The application should be running at `http://localhost:8000`.

### Run the E2E tests

**Option 1: Manual testing (requires server running)**

1. Start the development server: `deno task dev`
2. In another terminal, run: `deno task test:e2e`

**Option 2: Automated testing (handles server lifecycle)**

```bash
deno task test:full
```

This option automatically:

- Starts the development server
- Waits for it to be ready
- Runs the E2E tests
- Performs robust cleanup (graceful termination, force-kill if needed)
- Handles interruption signals (Ctrl+C)
- Exits with appropriate status codes

**Option 3: Run all tests in the tests directory**

```bash
deno task test

# Run tests with verbose output
deno test -A tests/e2e.test.ts --verbose
```

## Test Coverage

The E2E test (`e2e.test.ts`) covers:

1. **Page Loading**: Verifies the home page loads correctly with proper title
   and content
2. **Counter Functionality**: Tests increment and decrement operations
3. **Dynamic Title Updates**: Ensures the page title changes based on counter
   value
4. **Singular/Plural Handling**: Tests proper grammar (1 Counter vs 2+ Counters)
5. **Boundary Conditions**: Ensures counter cannot go below 1
6. **UI Elements**: Verifies button styling and page structure
7. **Content Verification**: Checks for proper text content and code elements
8. **API Route Testing**: Tests the `/api/[name]` endpoint with various inputs:
   - Basic name capitalization (john → Hello, John!)
   - Already capitalized names (MARY → Hello, MARY!)
   - Names starting with numbers (123test → Hello, 123test!)
   - Single characters (a → Hello, A!)
   - Special characters (test-name → Hello, Test-name!)
   - Underscored names (test_name → Hello, Test_name!)
   - Numeric strings (123 → Hello, 123!)

## Technology

- **Browser Automation**: [Astral](https://github.com/lino-levan/astral) - A
  Deno-native browser automation library
- **Assertions**: Deno Standard Library assertions
- **Test Runner**: Deno's built-in test runner

## Notes

- Tests run in headless mode by default for CI/CD compatibility
- Astral automatically handles browser lifecycle (launch/cleanup) with
  `await using`
- The tests include small timeouts to ensure DOM updates complete
- All tests are isolated and do not depend on each other
- Astral downloads and manages its own Chromium binary automatically
