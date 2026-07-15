# License classification

Every dependency this tool finds gets sorted into one of three buckets. This page explains
what each bucket means and why a given license lands where it does.

## The three buckets

**ok.** Permissive licenses. You can use these without extra legal review in almost all cases.

**warning.** Weak copyleft licenses, or a license we could not confidently identify. These
need a second look before you rely on them.

**critical.** Strong copyleft licenses. Using one of these can require you to release your own
code under the same terms. Get sign off before you use them.

Unknown or missing license data always falls into warning, never ok. A gap in the data should
never look like a clean bill of health.

## Changing a bucket

Open the config file in your repo (default path `.github/license-audit.yml`) and add the
license under `licenses.ok`, `licenses.warning`, or `licenses.critical`. Whatever bucket you
put a license in always wins over the defaults below. See
[configuration.md](configuration.md) for the full file format.

You do not need to worry about the exact wording a registry reports. `MIT`, `MIT License`, and
`The MIT License (MIT)` all resolve to the same entry automatically.

## Default table

| License | Bucket | Why |
|---|---|---|
| MIT | ok | Attribution only, no copyleft. |
| MIT-0 | ok | Public domain equivalent. |
| Apache-2.0 | ok | Attribution and a patent grant, no copyleft. |
| BSD-2-Clause | ok | Attribution only, no copyleft. |
| BSD-3-Clause | ok | Attribution only, no copyleft. |
| 0BSD | ok | Public domain equivalent. |
| ISC | ok | Attribution only, functionally identical to MIT. |
| Unlicense | ok | Public domain dedication. |
| CC0-1.0 | ok | Public domain dedication. |
| Zlib | ok | Attribution only, no copyleft. |
| WTFPL | ok | Public domain equivalent. |
| LGPL-2.1 | warning | Copyleft only for changes to the library itself; safe use depends on how you link it. |
| LGPL-3.0 | warning | Same as LGPL-2.1, with added patent terms. |
| MPL-2.0 | warning | File level copyleft; safe use depends on your distribution model. |
| MPL-1.1 | warning | Older version of MPL-2.0, same tradeoffs. |
| EPL-1.0 | warning | File level copyleft, common in Java tooling. |
| EPL-2.0 | warning | Newer version of EPL-1.0. |
| CDDL-1.0 | warning | File level copyleft, known to conflict with GPL. |
| CDDL-1.1 | warning | Newer version of CDDL-1.0. |
| UNLICENSED | warning | npm's "not for redistribution" marker, not a real license. |
| GPL-2.0 | critical | Strong copyleft: derivative works must be released under GPL-2.0. |
| GPL-3.0 | critical | Strong copyleft: derivative works must be released under GPL-3.0. |
| AGPL-3.0 | critical | Strong copyleft that also covers running the code as a network service. |
| SSPL-1.0 | critical | Requires open sourcing the surrounding service, not just the library. |

Anything not on this list, or any license string we could not confidently match to an entry
above, is treated as warning until you tell us otherwise in your config file.
