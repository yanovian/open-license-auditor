# Configuration

There are two places to configure this Action: the workflow file that calls it, and an
optional config file in your repo. This page covers both.

## Workflow inputs

Set these under `with:` in your workflow step. All of them are optional.

| Input | Default | What it does |
|---|---|---|
| `config-path` | `.github/license-audit.yml` | Where to find your config file. |
| `severity-filter` | `both` | What the PR comment shows: `critical`, `warning`, `both`, or `none`. |
| `fail-on` | `critical` | What makes the Action exit non-zero: `critical`, `warning`, or `none`. |
| `comment-on-pr` | `true` | Whether to post a PR comment at all. |
| `comment-only-on-problems` | `false` | If `true`, skip commenting entirely when nothing is wrong. |
| `update-existing-comment` | `true` | Edit the previous comment instead of posting a new one each run. |
| `github-token` | `${{ github.token }}` | Token used to read the PR and post the comment. |
| `cache` | `true` | Cache license lookups across workflow runs, so repeat runs are faster. |

The default `github-token` value is enough, no token setup needed, as long as your workflow
grants `pull-requests: write`. See the README's "Permissions and tokens" section for the fork
pull request caveat.

Example:

```yaml
- uses: yanovian/open-license-auditor@v1
  with:
    severity-filter: critical
    fail-on: critical
    comment-only-on-problems: true
```

## Config file

The config file is optional. Without one, every supported ecosystem is scanned and the
default license buckets apply. Copy
[`examples/license-audit.config.yml`](../examples/license-audit.config.yml) into your repo at
`.github/license-audit.yml` to start customizing it.

```yaml
version: 1

# Optional: turn off specific ecosystems. Anything not listed here is scanned automatically.
# ecosystems:
#   gradle: false

licenses:
  ok:
    - MIT
  warning:
    - LGPL-2.1
  critical:
    - GPL-3.0

# ignorePaths:
#   - examples
#   - test-fixtures
```

### `ecosystems`

A map of ecosystem name to `true` or `false`. Every ecosystem is on by default; only list the
ones you want to turn off. Supported names: `npm`, `pip`, `cargo`, `go`, `maven`, `gradle`,
`rubygems`, `composer`, `nuget`.

### `licenses`

Three lists: `ok`, `warning`, `critical`. Add a license's SPDX id to whichever list matches how
you want it treated. An id you list here always overrides its default bucket, in either
direction. You never need to worry about how a registry phrases a license string. See
[license-classification.md](license-classification.md) for the full default table and how
license strings get matched.

### `ignorePaths`

A list of path prefixes, relative to the repo root, that this Action should skip entirely. Any
file whose path equals or starts with one of these prefixes is excluded before manifest
discovery, so it never contributes a manifest to scan or an unsupported-ecosystem note. Useful
for excluding examples, fixtures, or vendored sample projects that happen to contain their own
package manifests.

```yaml
ignorePaths:
  - examples
  - test-fixtures
```
