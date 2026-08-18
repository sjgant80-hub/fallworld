# Working on fallworld

Read `SPEC.md` first — it says what this is and why each decision went the way it did.

## The rule that matters most here

**Check the estate before writing anything.** This repository already contains five kernels that
were written from scratch while better versions existed elsewhere in the estate: the cascade
(`fall-kit`), the provider list (`fallcompass`), the plugin manifest (`fall-registry`), the didy's
kernels (`didy-kernels`) and the conductor itself (`fall-os`).

Before adding a module, grep the index and say out loud what you found:

> "The estate has X and Y; I am writing Z because neither does ___."

If that sentence cannot be finished, do not write Z.

## The engine is not ours

`vendor/` is fetched from upstream and kept byte-identical. Never edit anything in it. If it needs to
change, change it in fall-os and re-run `node sync-fallos.mjs`. CI fails on drift.

## Read the interface before calling it

Two bugs in this repo came from guessing rather than reading:
`walk()` refuses an infinite purse — unlimited is not a budget — and passing one made every route
unaffordable including the free one. `phrase()` takes a single prompt and never throws; it catches
and reports in `note`.

## What a change has to survive

```bash
node --test                    # every suite
node check-workflows.mjs       # a run: | block that loses its indent silently breaks a workflow
node build-client.mjs          # index.html is generated; CI diffs it
node sync-fallos.mjs --check   # still in step with upstream
```

Then the estate's own guts, which are the ones that count:

```bash
node ../acg-assessor/assessor.mjs .    # the structural gut
node ../konomify/konomify.mjs .        # the whole chain
```

`witness` scoring 1.00 is not the finish line. This build scored 1.00 on every kernel while the
structural assessor called the whole thing scaffold.

## Words on the screen

No estate vocabulary reaches a visitor: no organs, no conductors, no tiers, no κ. The engine gets
named — "powered by fall·os", the way a game names its engine — and nothing of how it works is shown.
