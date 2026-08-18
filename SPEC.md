# fallworld — what it is, and the decisions behind it

## What it is

fallworld is the easy face of [fall-os](https://github.com/sjgant80-hub/fall-os). fall-os is the
engine: a conductor, organs, routing, a shadow index. fallworld is where a person who has never
heard of any of that can use it, learn it, and build on it — installed like a game, played like one.

You do not read a manual. You type something you are actually trying to decide, and it works before
you have set anything up.

## The decisions, and why they went that way

**1 · The engine is vendored, never re-implemented.**
`vendor/` holds fall-os, fall-kit and fallcompass, byte-identical to upstream, checked by CI
(`sync-fallos.mjs --check`). This rule exists because it was broken: five kernels in this repo were
written from scratch while the estate already owned better versions. A second engine beside the real
one is worse than none — they drift, and the copy is the one people read.

**2 · The first move cannot fail.**
No key, no account, no model, no network. The tier-0 conductor is deterministic code, so a brand new
visitor gets a real result in ten seconds. A tool that needs setting up before it does anything never
gets past the download.

**3 · Everyone starts renting, and the bill goes DOWN.**
Day one you paste a key you already have and everything is rented. As you build your own capability
the same jobs stop costing you anything. The number on the bar is measured from what actually ran,
never from what you installed — you can check it against your card. No subscription business can
copy a product whose success metric is you needing it less.

**4 · It never silently escalates.**
Ask for something to stay on your machine and it cannot, and the answer is "no" with a reason.
Spending somebody's money to keep a screen moving is the failure this whole thing exists to prevent.
This is a deliberate departure from fallcompass's auto-failover, which is right for a shim and wrong
for a product about cost.

**5 · One thing opens at a time.**
Panels appear when the thing that makes them make sense has been done. Greying out six panels is the
same as showing somebody six panels: they still have to look at each and work out they cannot have
it. A guide speaks one line at a time and can always be dismissed.

**6 · The shop refuses most of the estate.**
Every listing is ranked by what its own CI actually ran — never by what its author claimed — and
anything with no evidence cannot be listed at any price. Of 534 public builds, 81 list and 453 are
refused. A paid listing must be Proven, which currently refuses two of the three things worth
selling. That is the rule working on its own author.

**7 · Permissions are judged as a pile.**
Every permission system fails the same way: each addon looks fine alone, you approve them one at a
time, and nobody sees the total. Bags computes what everything installed can do *between* them and
names the reach that exists only because of the combination.

**8 · An addon declares before it can act.**
It runs in a frame with `default-src 'none'` — no fetch, no image, no socket, no access to this page.
It loads in two phases: in the first it has no host object at all and can only state what it is. The
host compares that against what the shop showed you, and only then is a host built. A file that wants
more than its listing declared is refused with the difference named.

## Running it

```bash
node sync-fallos.mjs      # pull the engine from upstream
node build-client.mjs     # generate index.html from the kernels + world.json
node --test               # the suites
node check-workflows.mjs  # the CI files still parse as CI files
```

`index.html` is generated and committed; CI regenerates and diffs it, so the published page can never
disagree with the kernels it claims to run.

## What is not built

Payment. A paid addon says plainly that nothing was charged. Taking money needs a processor and a
decision that is not this repository's to make.
