<div align="center">

# Open License Auditor

[🛒 Marketplace](https://github.com/marketplace/actions/open-license-auditor) • [⚙️ Configuration](_docs/configuration.md) • [📋 License classification](_docs/license-classification.md) • [❓ FAQ](_docs/faq-and-limitations.md)

[![Latest release](https://img.shields.io/github/v/release/yanovian/open-license-auditor)](https://github.com/yanovian/open-license-auditor/releases/latest)
[![Marketplace](https://img.shields.io/badge/Marketplace-Open%20License%20Auditor-blue?logo=github)](https://github.com/marketplace/actions/open-license-auditor)
[![CI](https://github.com/yanovian/open-license-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/yanovian/open-license-auditor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/yanovian/open-license-auditor)](LICENSE)

</div>

A GitHub Action that maps every dependency in your repo, direct and indirect, and flags any
open source license that could be a problem. It supports npm, Yarn, pnpm, pip, Poetry, uv,
Cargo, Go modules, Maven, Gradle, RubyGems, Composer, and NuGet, and scans all of them
automatically.

Available on the [GitHub Marketplace](https://github.com/marketplace/actions/open-license-auditor).

On every pull request, it posts one comment: a direct list of anything risky, plus a full
dependency map you can expand if you want to see everything. If nothing is wrong, it just says
so.

## Quick start

1. Copy [`examples/workflows/license-audit.yml`](examples/workflows/license-audit.yml) into
   `.github/workflows/license-audit.yml` in your repo.
2. That's it. Open a pull request and the Action runs automatically.

Want to change which licenses count as ok, warning, or critical? Copy
[`examples/license-audit.config.yml`](examples/license-audit.config.yml) into
`.github/license-audit.yml` and edit it. See [`_docs/configuration.md`](_docs/configuration.md)
for every option.

## What critical, warning, and ok mean

- **ok**: a permissive license. Safe to use without extra review in almost all cases.
- **warning**: a weak copyleft license, or one we could not confidently identify. Worth a
  second look.
- **critical**: a strong copyleft license. Using it can require you to open source your own
  code.

Full table and reasoning: [`_docs/license-classification.md`](_docs/license-classification.md).

## Permissions and tokens

You do not need to create any token yourself. The default `GITHUB_TOKEN` that GitHub Actions
provides automatically is enough, as long as your workflow grants it permission to write pull
request comments:

```yaml
permissions:
  pull-requests: write
  contents: read
```

The example workflow above already includes this. Without it, the Action can still audit your
dependencies and fail the check, it just cannot post the comment.

**One limitation:** if a pull request comes from a fork, GitHub gives the default token
read-only access no matter what permissions your workflow requests, so the comment will not be
posted. This is a GitHub security restriction, not something this Action can work around. If
you need comments on fork pull requests, change the workflow trigger from `pull_request` to
`pull_request_target` instead. Read up on the tradeoffs first: `pull_request_target` runs with
your base repository's permissions even for untrusted forks, so only do this if your workflow
does not check out or run code from the fork.

## Docs

- [Configuration](_docs/configuration.md): every workflow input and config file field.
- [License classification](_docs/license-classification.md): the full default table and why.
- [FAQ and limitations](_docs/faq-and-limitations.md): what this tool cannot do yet, and why.

## A note on trust

This is an automated check. License detection can be wrong, and a license can change between
versions of a package. Use it as a starting point, not a final answer.

## Contributing

This project uses [pnpm](https://pnpm.io) and Node 24. See [`Makefile`](Makefile) for the
available dev commands (`make install`, `make test`, `make lint`, `make verify`, and so on).
