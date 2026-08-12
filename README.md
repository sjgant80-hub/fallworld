# Fall World

### ▶ **https://sjgant80-hub.github.io/fallworld/**

**Your didy is your character. Every tool you own is a piece of gear. Rarity is proof — not luck.**

One place where the whole estate is walkable: **1,624 repositories collapsed into 598 items**, sorted
into nine seats, every live one openable in a click.

---

## Why it reads like a game

Because 1,624 repositories is illegible to everyone, including the person who built them — and
*armour, gear, rarity, levels* is vocabulary every human already holds. The vocabulary is not
decoration. Each game word maps onto machinery that already exists and is already gated:

| Game word | What it actually is |
|---|---|
| your character | an agent bounded by a capability grant and a budget |
| item stats | what an organ may touch, at what level, checked before it acts |
| item level | whether it passed a gate — unproven gear cannot be equipped |
| mana / durability | the budget: calls and spend. Refused actions cost nothing |
| respec | attenuation — a loadout can only ever shrink |
| the raid | trustless cross-verification with peers who do not trust you |

## Rarity is proof-strength, not scarcity

In most games an item is gold because of a dice roll. Here every tier is **computed from evidence in
the index**, and each item carries the reason it got the colour it did.

| | Tier | Earned by |
|---|---|---|
| ⬜ | **Unidentified** | it exists and nothing anywhere says what it does |
| ⬛ | **Normal** | described, but nothing live to open |
| 🟦 | **Magic** | live, described, open it right now |
| 🟨 | **Rare** | live and ships the full api/mcp/sdk set |
| 🟧 | **Unique** | a machine tried to break it and it held |
| 🟩 | **Set** | gated *and* ships the full set — it combos |

## The ten rungs

**1** Awake · **2** Bounded · **3** Named · **4** Reading · **5** Gated · **6** Geared · **7** Met ·
**8** Wired · **9** Raided · **10** Sovereign

Two rules make the ladder mean something:

- **There is no setter.** You hand it evidence and it reads you. Nothing can award a level, and
  nothing accepts a level as input.
- **You cannot skip a rung.** A gap at 2 caps you at 1 even if 9 is true. Levelling is the
  conjunction of everything below it, not the maximum of what happens to be true.

Rungs 1–4 you reach alone. From 5 a machine has to agree with you. **From 7 a stranger does** — and
the sheet says so, because self-assessment and peer-verification are not the same evidence.

## Generated, never typed

Every item on the page comes from the estate index. Nothing is hand-maintained, so nothing can
quietly rot:

```bash
node build-world.mjs
```

Re-run it and the world is true again. A hand-typed map of 598 things is wrong the day after it is
written.

## The 56 unidentified

56 items exist that **nothing anywhere describes** — not the repository, not the estate's memory.
Several are load-bearing. They are shown, not hidden, because a map that quietly omits what it cannot
name is worse than one that admits the gap.

## Local preview

```bash
node serve.mjs
```

`fetch('world.json')` cannot work from a `file://` URL, so the page needs a server to be checked
locally. GitHub Pages serves it directly.

---

MIT · part of the Fall estate · [fall-os](https://sjgant80-hub.github.io/fall-os/) ·
[fallkard](https://sjgant80-hub.github.io/fallkard/) ·
[fallmarket](https://sjgant80-hub.github.io/fallmarket/) ·
[agora](https://sjgant80-hub.github.io/agora/)
