# AGENTS.md

## 1. Project goal

This repository implements a static movie schedule viewer for GitHub Pages and
Dockerized Nginx. It displays current screening schedules for these three theaters:

- 109シネマズ名古屋
- ミッドランドスクエアシネマ
- イオンシネマ常滑

The application must continue to support title search, three-day date switching,
movie details, theater details, screening times, source information, and safe links
to official reservation or schedule pages. Correct movie posters are a primary
feature, not optional decoration. Real-mode movies should be enriched with poster
metadata from TMDB when a conservative title match can be established.

The current visual design is accepted. Do not redesign the UI or add decorative
colors, gradients, excessive rounded corners, animations, or a UI framework unless
the user explicitly requests a design change. Data-mode wording, accessibility,
error states, and small layout corrections are not considered a redesign.

## 2. Sources of truth and precedence

Always read `AGENTS.md` and `docs/real_data_spec.md`. Consult the other documents
only for requirements not already resolved by those two files:

1. `AGENTS.md`
2. `docs/real_data_spec.md`
3. `docs/movie_app_prototype_spec.md` when a base UI or routing requirement is needed
4. `README.md` when commands or user-facing behavior are changed

Use `docs/movie_app_prototype_spec.md` as the base product specification.

For real-data retrieval, TMDB poster enrichment, title normalization, data
validation, UI wording by data mode, GitHub Pages publication, and Docker-only local verification,
`docs/real_data_spec.md` overrides older prototype-only requirements.

If an older section says that GitHub Pages must remain in sample mode, that real
data is manual-validation-only, or that every screening link must be labelled as a
demo, treat that statement as superseded by `docs/real_data_spec.md`.

Do not silently choose between requirements that still conflict after applying this
precedence. Report the exact conflict and ask only when it materially blocks work.

## 3. Current authorization

The user authorizes publication of factual screening schedule data on GitHub Pages
for the three theaters listed in Section 1 and non-commercial use of the TMDB
Developer API for movie identification and poster images, subject to the
restrictions and attribution requirements in `docs/real_data_spec.md`.

This authorization does not extend to any other theater, aggregation site, paid
API, non-TMDB movie metadata source, synopsis or cast copying, authentication bypass,
or access-control circumvention. The approved TMDB attribution logo is allowed only
for the attribution required by TMDB.

## 4. Non-negotiable constraints

- Do not add a paid service. TMDB is the only permitted external movie-information
  API and may be used only for conservative movie matching, TMDB IDs, poster paths,
  and the attribution needed for those posters.
- Retrieve schedules only from the official sources and allowlisted hosts specified
  in `docs/real_data_spec.md`.
- Do not access search engines, aggregation sites, or additional theaters from the
  retrieval code.
- Do not bypass login, authentication, CAPTCHA, robots/access controls, HTTP 403,
  or HTTP 429.
- Do not use Selenium, Playwright, browser automation, `eval`, or `Function` for
  schedule retrieval or parsing.
- Retrieve only factual fields needed to display schedules.
- Do not copy or hotlink posters from theater sites or other unapproved sources.
  TMDB poster CDN URLs are permitted under the non-commercial developer terms and
  required attribution. Do not import synopsis, cast, ratings, reviews, videos, or
  unrelated TMDB metadata.
- Do not guess missing metadata or construct reservation URLs that were not safely
  obtained from an official response or explicitly configured official page.
- Do not add a backend server, database, authentication system, payment flow, or
  persistent GitHub Actions server.
- Do not hardcode credentials, cookies, secrets, tokens, or user-specific URLs.
- Never expose `TMDB_API_READ_TOKEN` in source, generated JSON, browser JavaScript,
  static HTML, Docker layers, command output, test snapshots, or logs.
- Do not assume the site is hosted at the domain root.
- The site must work at `https://<user>.github.io/<repository>/` and under Nginx at
  `http://localhost:8080/` from the same `dist` output.
- Keep Vite compatible with the repository subpath, using relative internal URLs
  and `base: "./"` unless an equally safe tested solution is required.
- Do not insert user-controlled, URL-derived, or fetched text with unsafe
  `innerHTML`.
- Do not bypass TypeScript errors with broad `any` usage.
- Do not disable checks or delete tests to obtain a passing result.
- Do not leave required functionality as TODOs, inactive controls, or unverified
  placeholders.
- Preserve unrelated user changes in a dirty worktree.

## 5. Local environment policy

The repository is stored in WSL. The WSL host provides Docker Engine and Docker
Compose, but should not require Node.js or npm.

- Do not install Node.js, npm, or JavaScript dependencies directly on the WSL host.
- Do not create or rely on host-side `node_modules`.
- Do not run `npm`, `npx`, `node`, `tsx`, `vite`, `vitest`, `eslint`, or `prettier`
  directly on the WSL host.
- Run local dependency installation, data generation, validation, linting,
  formatting checks, tests, and builds inside Docker build stages or disposable
  containers.
- Node.js and npm may be used inside Docker images and GitHub Actions runners.
- Do not claim that a host-side npm command was run.
- Do not change the project to require Docker Desktop; Docker Engine is sufficient.
- Pass the TMDB token to local real-mode builds as a Docker BuildKit secret. Do not
  use Docker `ARG` or persistent `ENV` for the token.

The Docker build must remain reproducible from `package-lock.json`. Adding a
dependency requires a clear need and an updated lockfile.

## 6. Required stack

- Vite
- TypeScript
- HTML and CSS without a UI framework
- Vitest
- ESLint
- Prettier
- Multi-stage Docker build
- Nginx runtime image
- Docker Compose
- GitHub Actions deployment to GitHub Pages

New dependencies must be necessary, narrowly scoped, maintained, and compatible
with the static deployment model.

## 7. Data modes

The application supports both modes:

- `sample`: deterministic local demonstration data, clearly labelled as sample data.
- `real`: current factual schedules retrieved from the three authorized theaters.

`sample` remains available for offline and deterministic testing. Published GitHub
Pages builds use `real` mode.

The UI must read the generated data mode instead of assuming either mode. Shared
components must not contain unconditional demo wording.

Real-data replacement is all-or-nothing. Do not replace the last valid generated
dataset unless all three providers were fetched, parsed, normalized, and validated
successfully.

## 8. Package commands

Keep these package scripts available for use inside Docker and GitHub Actions:

```text
npm run generate:data
npm run validate:data
npm run validate:real-data
npm run lint
npm run format:check
npm run test:run
npm run build
npm run dev
```

`npm run format` is a modifying command and is not a substitute for
`npm run format:check` during final verification. `npm run test` may start watch
mode; automated verification must use `npm run test:run`.

## 9. GitHub Pages and Actions

The Pages deployment workflow must run for:

- pushes to `main`;
- manual `workflow_dispatch`;
- the configured schedule.

For each deployment it must:

1. check out the repository;
2. install locked dependencies;
3. fetch real theater data with `DATA_MODE=real`;
4. enrich conservatively matched movies through TMDB using
   `TMDB_API_READ_TOKEN: ${{ secrets.TMDB_API_READ_TOKEN }}`;
5. validate schedules, poster URLs, match metadata, and poster coverage;
6. run lint, formatting checks, tests, and TypeScript/build checks;
7. upload `dist` only after every preceding step succeeds;
8. deploy through the official GitHub Pages actions.

If any provider, validation, test, or build step fails, the workflow must fail before
the Pages artifact is deployed. Never silently deploy sample or partial data as a
fallback. The previous successful Pages deployment should therefore remain online.

A separate manual real-data validation workflow may generate an artifact for
diagnostics, but it must not deploy Pages.

Use minimum required permissions, deployment concurrency, dependency caching where
safe, and bounded workflow time. GitHub Actions is a scheduled build environment,
not a persistent server.

## 10. UI and accessibility rules

Preserve the existing simple visual design and responsive layout.

In `real` mode, display:

- that the schedules are obtained from official theater information;
- the latest successful retrieval/update timestamp;
- the relevant theater/source name or official source link;
- a concise notice that schedules can change and should be confirmed on the
  official site before purchase.
- a correctly matched TMDB poster for normal movie releases whenever available;
- the required TMDB logo and attribution notice in a Credits/About-equivalent area.

In `sample` mode, clearly display that the content and links are demonstrations.

Do not display `デモ`, `サンプル`, `デモ予約ページ`, or equivalent wording in
real mode. Do not describe a generic placeholder as a demo poster in real mode; use
neutral wording such as `ポスター画像なし` where an accessible label is needed.

Do not accept a wrong poster merely to improve coverage. Unmatched event screenings
may use a neutral title-bearing fallback. Preserve a 2:3 poster area to avoid layout
shift, use lazy loading below the fold, and keep the existing simple card-centered UI.

Safe official reservation links should be distinguishable from non-link screening
times. Preserve keyboard operation, visible focus, semantic headings, labels,
alternative text, and understandable empty/error states.

Invalid IDs, invalid dates, missing links, no search results, empty schedules, and
failed placeholder loading must produce visible Japanese fallback states rather
than a blank page.

## 11. URL and link rules

Use the established query-parameter routes:

```text
index.html?date=YYYY-MM-DD&q=QUERY
movie.html?id=MOVIE_ID&date=YYYY-MM-DD
theater.html?id=THEATER_ID&date=YYYY-MM-DD
```

Centralize construction and parsing with `URL` and `URLSearchParams`. Preserve the
selected date during navigation.

External links must use HTTPS, pass the relevant host allowlist, and use safe
external-link attributes such as `noopener` and `noreferrer` when opening a new tab.

## 12. Testing requirements

Keep provider parsing tests network-independent by using minimal synthetic HTML or
JSON fixtures. Do not commit full copies of official pages.

Tests must cover at least:

- each provider's normal parsing path;
- multiple screenings and screen/format extraction;
- Japanese date/time conversion and late-night screenings;
- EUC-JP decoding for 109シネマズ;
- safe extraction of Midland links without executing JavaScript;
- rejection of invalid or non-allowlisted URLs;
- HTTP timeout, size limit, redirect, retry, 403, and 429 behavior;
- empty, missing, malformed, and changed structures;
- title normalization, format-prefix separation, aliases, deterministic IDs, and
  duplicate removal;
- all-three-provider aggregation and all-or-nothing failure;
- generated-data schema and references;
- sample/real conditional UI wording;
- Pages-compatible relative URLs.
- TMDB authentication without token leakage;
- conservative exact/alias/year-aware matching and rejection of ambiguous results;
- TMDB image-host validation, fallback behavior, coverage reporting, and attribution.

Do not weaken assertions merely because an official site changed. Update the parser,
fixture, and rationale together.

## 13. Local verification policy

Local verification must use Docker only. A sample build does not need a secret. A
real build must receive the TMDB token as a BuildKit secret, never as a build arg:

```bash
docker build --build-arg DATA_MODE=sample -t movie-checker:sample .
docker build --build-arg DATA_MODE=real \
  --secret id=tmdb_token,env=TMDB_API_READ_TOKEN \
  -t movie-checker:real .
```

Then start the real-mode application through Compose:

```bash
DATA_MODE=real docker compose up --build -d
docker compose ps
```

Confirm that the container is healthy and that these paths return HTTP 200:

```text
http://localhost:8080/
http://localhost:8080/movie.html
http://localhost:8080/theater.html
```

Inspect the generated site sufficiently to confirm that it is in real mode, contains
all three theaters, has a current retrieval timestamp, displays correctly matched
posters without broken images or hardcoded demo wording, and includes TMDB
attribution. Stop the containers afterward:

```bash
docker compose down
```

If Docker or outbound access is unavailable, do not substitute host-side npm
commands. State exactly what could not be verified and why.

Never claim a command, page, provider, or visual check passed unless it was actually
executed or inspected successfully.

## 14. Work procedure and usage economy

1. Run `git status` and inspect existing changes.
2. Read `AGENTS.md` and the relevant sections of `docs/real_data_spec.md` once. Do
   not print or repeatedly summarize them.
3. Inspect only relevant files first, using `rg` and targeted ranges rather than
   repeatedly dumping the whole repository.
4. Create at most a five-item internal checklist and continue directly into one
   coherent implementation pass.
5. Reuse the existing HTTP client, normalization pipeline, generated schema, UI
   components, and tests rather than introducing parallel systems.
6. Add focused offline tests while implementing; do not rerun the full suite after
   every small edit.
7. Run one final full Docker verification after focused tests pass. A second full
   pass is needed only when the first pass finds a failure that was changed.
8. Review GitHub Actions statically for real-mode generation and fail-closed deploy
   ordering.
9. Update README when commands, behavior, sources, limitations, or human-operated
   steps change.
10. Give a concise completion report; do not restate the specifications.

To conserve Codex usage, do not perform speculative refactors, broad visual redesign,
dependency churn, duplicate self-review turns, or unrelated cleanup. Do not stop
after a plan and require a second prompt to implement. Complete implementation,
focused tests, final verification, and reporting in the same task whenever possible.

Ask a question only when a missing choice materially changes the result or when
permission is required. Resolve ordinary implementation details using the
specification and the simplest maintainable approach.

## 15. Git policy

- Do not commit, push, create a pull request, change repository settings, or trigger
  a deployment unless the user explicitly requests it.
- Local file edits and verification are allowed when implementation is requested.
- Do not rewrite history or discard unrelated changes.
- Before reporting completion, show the user which files should be committed and any
  GitHub-side step they must perform.

## 16. Completion report

Report all of the following:

- implemented and corrected behavior;
- major technical decisions;
- changed files;
- Docker commands actually run and their outcomes;
- sample-mode and real-mode verification results;
- provider counts and retrieval timestamps when real retrieval was run;
- TMDB match count, unmatched titles, poster coverage, and attribution check;
- GitHub Actions changes and fail-closed behavior;
- specification deviations and reasons;
- unverified items and remaining problems;
- exact human steps still required, including commit, push, workflow run, or Pages
  inspection.
