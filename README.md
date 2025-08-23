# Fresh project

Your new Fresh project is ready to go. You can follow the Fresh "Getting
Started" guide here: https://fresh.deno.dev/docs/getting-started

## Usage

Make sure to install Deno:
https://docs.deno.com/runtime/getting_started/installation

Then start the project in development mode:

```bash
deno task dev
```

This will watch the project directory and restart as necessary.

## Testing

This project includes comprehensive end-to-end tests using
[Astral](https://github.com/lino-levan/astral), a Deno-native browser automation
library.

### Running Tests

**Option 1: Manual testing (requires server running)**

1. Start the development server: `deno task dev`
2. In another terminal, run: `deno task test:e2e`

**Option 2: Automated testing (handles server lifecycle)**

```bash
deno task test:full
```

**Option 3: Run all tests in the tests directory**

```bash
deno task test
```

### Test Coverage

The E2E tests cover:

- Page loading and initial state
- Counter increment/decrement functionality
- Dynamic page title updates
- Singular/plural text handling
- Boundary conditions (counter minimum value)
- UI element verification
- Content and styling validation
- API route functionality (`/api/[name]` endpoint)

For more details, see the [tests documentation](./tests/README.md).

## Project Structure

- `routes/` - Fresh routes and pages
- `islands/` - Interactive client-side components
- `components/` - Reusable components
- `static/` - Static assets
- `tests/` - End-to-end integration tests
- `.github/workflows/` - CI/CD configuration
