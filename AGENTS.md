# AGENTS.md

## Project goal

Implement the movie theater screening prototype described in `docs/movie_app_prototype_spec.md`.

The application must:

- be published as a static GitHub Pages project site;
- run from the same build output in a Dockerized Nginx server;
- show movies and theaters for today and the next three days;
- support title search, date switching, movie details, theater details, screening times, and external reservation links;
- use generated sample data in the prototype;
- remain structured so that a real data provider can replace the sample generator later.

The specification is the source of truth. Read it completely before editing code.

## Non-negotiable constraints

- Do not add scraping or an external movie API in the prototype.
- Do not add a backend server, database, authentication, or payment flow.
- Do not use copyrighted real movie posters without explicit permission.
- Use local placeholder posters and clearly label all screening and reservation data as demo data.
- Do not hardcode API keys, tokens, secrets, user-specific URLs, or credentials.
- Do not assume the site is hosted at the domain root.
- The site must work at `https://<user>.github.io/<repository>/`.
- Use relative internal URLs and configure Vite with `base: "./"`.
- Do not use `innerHTML` for user-controlled or URL-derived values.
- Do not bypass TypeScript errors with broad `any` usage.
- Do not disable lint rules or delete tests merely to make checks pass.
- Do not leave required features as TODOs, inactive buttons, or placeholder implementations.

## Required stack

- Vite
- TypeScript
- HTML and CSS without a UI framework
- Vitest
- ESLint
- Prettier
- Multi-stage Docker build
- Nginx runtime container
- Docker Compose
- GitHub Actions deployment to GitHub Pages

A different dependency may be added only when it materially simplifies a requirement and does not turn the project into a framework-heavy application.

## Required commands

Keep these commands available through `package.json` or equivalent scripts:

```bash
npm run generate:data
npm run validate:data
npm run lint
npm run format:check
npm run test:run
npm run build
npm run dev
```

The final implementation must also pass:

```bash
docker compose up --build -d
```

and serve the site at:

```text
http://localhost:8080
```

## Implementation order

1. Inspect the repository and read the full specification.
2. Create a concise implementation checklist.
3. Establish Vite, TypeScript, linting, formatting, and testing.
4. Implement domain types, sample-data generation, validation, selectors, and tests.
5. Implement the home page.
6. Implement movie and theater detail pages.
7. Implement error and empty states.
8. Implement the Docker image and Compose configuration.
9. Implement GitHub Pages deployment with GitHub Actions.
10. Complete the README.
11. Run every required check and fix all failures.

Do not jump directly to visual polish before the domain logic and automated checks are working.

## Data rules

- Generate at least 8 movies and 4 theaters.
- Generate screenings for today and the following 3 days in `Asia/Tokyo`.
- Do not commit permanently stale fixed dates as the active dataset.
- Validate required fields, unique IDs, references, dates, times, duplicates, and poster existence.
- Keep current-time-dependent logic testable by accepting `now` as a parameter.

## UI rules

The home page must include:

- shared header;
- search input;
- four date tabs;
- movie grid;
- theater list;
- update timestamp;
- demo-data notice.

Movie detail pages must show:

- poster;
- title and synopsis;
- metadata;
- date tabs;
- theaters and screening times;
- safe external reservation links.

Theater detail pages must show:

- theater information;
- official and reservation links;
- date tabs;
- movies and screening times.

Invalid IDs, invalid dates, empty data, no search results, and failed poster loading must produce visible Japanese fallback states rather than blank screens.

## URL rules

Use query parameters:

```text
index.html?date=YYYY-MM-DD&q=QUERY
movie.html?id=MOVIE_ID&date=YYYY-MM-DD
theater.html?id=THEATER_ID&date=YYYY-MM-DD
```

Centralize URL construction and parsing. Preserve date selection during navigation. Use `URLSearchParams`.

## GitHub Pages and Actions

The workflow must run on:

- pushes to `main`;
- manual `workflow_dispatch`;
- a scheduled trigger.

The workflow must:

1. install dependencies with `npm ci`;
2. generate and validate data;
3. run lint, formatting checks, tests, and build;
4. upload `dist` as the Pages artifact;
5. deploy through the official GitHub Pages actions.

Use minimum required permissions and deployment concurrency. Do not use Actions as a persistent server.

## Verification policy

After each meaningful phase, run the relevant checks. Before claiming completion, run all of the following:

```bash
npm run lint
npm run format:check
npm run test:run
npm run build
docker compose up --build -d
```

Then confirm the root URL responds, and stop the containers.

Never claim a command passed unless it was actually executed successfully. If a check cannot be run in the current environment, state exactly what was not verified and why.

## Completion report

Report:

- implemented features;
- major technical decisions;
- deviations from the specification and their reasons;
- exact commands run and outcomes;
- GitHub Pages settings still required from the user;
- any unverified or remaining items.
