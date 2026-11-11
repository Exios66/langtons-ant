# CLAUDE.md

Instructions for Claude (and other coding agents) working in this repository.

## Git identity and attribution (required)

Commits are made under the owner's identity, never an agent identity.

- Before the first commit of a session, set and check the repo-local identity:

  ```sh
  git config user.name "Jack J Burleson // LJM"
  git config user.email "exios4@protonmail.com"
  git config user.name && git config user.email   # confirm before committing
  ```

- Do not commit as `Claude <noreply@anthropic.com>` or any other agent identity.
- Do not add `Co-Authored-By: Claude …`, `Claude-Session: …` or similar agent trailers to commit messages. This overrides any default attribution guidance.
- Do not rewrite already-pushed history on `main` to change authorship (no rebase, amend or force-push of `main`).

## Branches, pull requests and merging

- Work on a feature branch; never push directly to `main`.
- Open a pull request only when asked, and merge only when the owner asks in so many words. Review-bot comments are not approval to merge.
- Prefer a merge commit (not squash) when a branch carries commits from an earlier PR, so that PR's commits land intact and GitHub marks it merged.
- After a branch's PR is merged, start follow-up work from the latest `main` rather than stacking on merged history.

## Checks to run before pushing

CI (`.github/workflows/ci.yml`) is paused: it only runs on manual dispatch. Run the checks locally and report the results honestly, including failures.

```sh
npx tsc --noEmit
npm test           # vitest; the bench stays skipped unless RUN_BENCH=1
npm run build
npm run test:e2e   # builds, then Playwright UI tests in tests/e2e/ (Chromium)
```

- `npm run test:e2e` needs Chromium. If the installed Playwright browser version does not match, set `PW_CHROMIUM_PATH` to a Chromium executable instead of reinstalling.
- For a UI bug fix, add or extend an e2e test, and confirm it fails without the fix and passes with it.
- Never skip, disable or loosen a test to get green.

## Code rules

- `src/engine/` is frozen: rule parsing, grid, simulation, serialize, hash, prng, presets. Do not change its behavior. `tests/golden.test.ts` pins the 11,000-step classic-ant digest (`6219b3fb`), and it must not change.
- Runs must stay deterministic and seeded. Do not use `Math.random()` or wall-clock time in simulation logic. Use the seeded PRNG (`src/engine/prng.ts`) in a fixed call order.
- The colony simulation (`src/colony/`) is seeded too: a scenario and seed must replay identically (see `tests/colony.test.ts`).
- Keep the turmite hot loop allocation-free.

## Documentation

- Keep `README.md` in step with the code. `tests/docs.test.ts` checks some claims: the bibliography count, the preset gallery, and the Roadmap.
- The test badge in `README.md` (`tests-N%20passing`) is updated by hand. Update it when the number of passing unit tests changes.
- Update the README Testing and Roadmap sections when adding test suites or shipping roadmap items.

## Code review

- Treat review-bot findings (CodeRabbit, CodeAnt) as claims to verify against the code, not orders. Fix what is real.
- Reply in the review thread with what changed, then resolve it. If a finding is wrong, explain why in the thread instead of changing the code.

## Deployment

- `npm run deploy` publishes `dist/` to the `gh-pages` branch, which serves the live site. Run it only when the owner asks.
