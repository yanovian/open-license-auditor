# FAQ and limitations

## This is an automated check, not legal advice

License detection can be wrong. A package's license can also change between versions. Treat
every result here as a starting point for review, not a final answer. When a critical or
warning finding actually matters to your business, confirm it against the package's real
license file and talk to whoever handles legal questions on your team.

## Why did a dependency show up as "warning" when I know its license is fine

Two common reasons. First, the registry may have reported a license string we do not
recognize yet. Add it to your config file's `licenses` list once you have confirmed it, see
[configuration.md](configuration.md). Second, some ecosystems do not resolve a dependency's
full version for every case (see the per-ecosystem notes below); an unresolved dependency is
reported as warning rather than skipped.

## Per-ecosystem limitations

**Gradle.** Only the modern single-file `gradle.lockfile` format is supported. If your project
has not enabled Gradle's dependency locking, its dependencies are not resolved. Gradle's
lockfile also does not record which dependency depends on which, so the full list is reported
flat rather than nested.

**Go.** `go.mod` records exact versions and flags indirect modules, but not which module pulls
in which. Every module is reported as a flat direct or indirect entry rather than nested.

**NuGet.** Most `packages.lock.json` files do not record dependency edges either, so NuGet
dependencies are reported the same way as Go and Gradle: flat, flagged direct or transitive.

**Maven.** Only dependencies with a literal `<version>` in the `pom.xml` itself are resolved.
A version inherited from a parent POM or a `<properties>` placeholder is skipped, since
resolving those fully would mean running Maven itself.

**Python (pip, Poetry, uv).** A pinned `requirements.txt` line (`package==1.2.3`) is resolved
directly. An unpinned line, without a `poetry.lock` or `uv.lock` present, cannot be resolved
and is skipped. License strings from PyPI are also often free text; only common phrasings are
recognized automatically.

**JavaScript/TypeScript (npm, Yarn, pnpm).** All three package managers are supported,
including older lockfile formats, so this also works on codebases that have not upgraded in a
while: `yarn.lock` covers both classic v1 and Berry v2+, and `pnpm-lock.yaml` covers both the
current "importers" layout and the pre-workspace layout from pnpm 5 and earlier.

**Rust (Cargo).** A path or git dependency has no resolvable published version and is skipped.

**Ruby and Composer.** Gemfile.lock and composer.lock both record real dependency edges, so
these two get an accurate nested tree.

## Why does the PR comment sometimes not show every dependency

The full dependency map is capped to stay under GitHub's comment size limit. If your project
has a very large dependency tree, check the full JSON report instead: the Action writes one to
disk on every run and exposes its path as the `report-path` output.

## What does the "Not checked" section in the comment mean

It appears only when there is something to explain, and lists two kinds of gaps by name:

- A package manager this tool supports, but that you disabled in your config file, for example
  "Ruby (`Gemfile`) was skipped. It is disabled in your config."
- A package manager this tool has no plugin for at all yet, for example
  "Swift (Swift Package Manager) is not yet supported. Found `Package.swift`."

If your repo has neither, you will not see this section.

## Why didn't I get a comment on a pull request from a fork

GitHub gives the default `GITHUB_TOKEN` read-only access on pull requests from forks, no
matter what permissions your workflow requests. The Action still runs and can fail the check,
it just cannot post the comment. See the README's "Permissions and tokens" section for the
`pull_request_target` workaround and its tradeoffs.

## Rate limits

License and dependency data comes from the [deps.dev](https://deps.dev) public API. This
Action backs off automatically when it gets rate limited, and caches results across workflow
runs (when `cache: true`, the default) so repeat runs on the same repo make far fewer calls.
