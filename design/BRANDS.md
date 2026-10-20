# SILICON EMPIRE — Brand Roster & Naming System

**Purpose:** populate the world with ~130 companies — mostly real firms under altered names, plus fictional ones — with enough personality that the market feels inhabited from 1990 onward.
Companion: `DOMAINS.md` (what they make), `PLAN.md` (systems).

---

## 1. Naming rules

Six transformations. Every brand uses exactly one, so the set feels deliberate rather than random.

| # | Rule | Example | Real source |
|---|---|---|---|
| R1 | **Vowel drift** — swap one vowel | Imtel, Lenova, Nokio, Bosh | Intel, Lenovo, Nokia, Bosch |
| R2 | **Consonant swap** — replace a stop/fricative | Hyniks, Micronix, Hitatchi | Hynix, Micron, Hitachi |
| R3 | **Syllable merge** — recombine into a plausible new word | Formosa Foundry, Cathay Power | TSMC, CATL |
| R4 | **Descriptor abstraction** — name the *thing*, not the firm | Ultraviolet Systems, Lone Star Instruments | ASML, Texas Instruments |
| R5 | **Founder/place shift** — respell an eponym or toponym | Hewlin Packard, Kyoto Toys | Hewlett-Packard, Nintendo |
| R6 | **Single-letter mutation** | Asux, Acre, Tomtorn | Asus, Acer, TomTom |

**Constraints (non-negotiable):**
- Never reuse a real trademark, and never a string within edit-distance 1 of one for a well-known brand.
- Max 3 syllables except deliberate legacy names (Formosa Foundry).
- Must be pronounceable aloud in a YouTube video; if a player can't say it, they won't remember it.
- Distinct first letter + silhouette from every other brand in the same segment — the leaderboard is scanned, not read.
- For anything you might publish commercially: run a real trademark search first. Off-names reduce risk, they don't eliminate it. Keep `realAnalog` in data as a **developer-only** field, never shipped in the UI.

---

## 2. Roster

Format: `Off-name` — *real analog* · region · tier · note. Tier is the market posture, not size: **P**remium, **V**alue, **E**nterprise, **C**ommodity, **S**pecialist.

### Fabs, equipment & materials (9)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Formosa Foundry | TSMC | Taiwan | P | pure-play foundry; capacity king, no own brand |
| Samseong Semi | Samsung Foundry | Korea | P | IDM + foundry, memory giant |
| Ultraviolet Systems | ASML | Netherlands | S | monopoly on the machine that makes everything |
| WorldFab | GlobalFoundries | US/EU | V | spun out of a giant, lives on mature nodes |
| Sinoic | SMIC | China | V | state-backed, node-capped by sanctions |
| Uniwafer | UMC | Taiwan | C | mature nodes, price competitor |
| Imtel Foundry | Intel | US | P | best nodes, worst customer service |
| Cantera Materials | Applied Materials | US | S | deposition/etch tools |
| Kestrel Instruments | KLA | US | S | inspection & metrology — fictional-flavoured |

### CPU / MPU (10)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| **Imtel** | Intel | US | P | market leader, execution stumbles, marketing machine |
| **AMB** | AMD | US | V | scrappy challenger, price/perf, comeback arcs |
| Aries Micro | ARM | UK | S | pure IP licensing, no fabs |
| Xyrix | Cyrix | US | V | budget clone chips, dies by 2000 |
| VIO | VIA | Taiwan | V | cheap x86, embedded survival |
| Motorex | Motorola | US | E | 68k then PowerPC, pivots to embedded |
| Solar Microsystems | Sun | US | E | SPARC workstations, arrogant, collapses |
| Digital Labs | DEC | US | E | Alpha chips, engineering-first, bought out |
| Nippon Compute | Fujitsu | Japan | E | mainframes, supercomputers |
| Renesa | Renesas | Japan | E | MCU powerhouse, quiet monopoly |

### GPU & graphics (7)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| **Nivida** | NVIDIA | US | P | ecosystem moat, software lock-in, premium pricing |
| **ATX** | ATI | Canada | V | price/raster competitor, acquired mid-game |
| TrideeFX | 3dfx | US | S | Voodoo era, dies by 2002 — a cautionary tale |
| Imagineering | Imagination/PowerVR | UK | S | mobile GPU IP, licensing-only |
| Metrox | Matrox | Canada | E | multi-monitor niche, never mainstream |
| EsThree | S3 | US | C | integrated graphics, commodity |
| Vudu Labs | 3dfx (fictional flavour) | US | S | **fictional** boutique card maker, enthusiast cult |

### Memory (DRAM / SRAM) (7)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Hyniks | SK Hynix | Korea | P | DRAM price-cycle whiplash |
| Micronix | Micron | US | P | survives every crash |
| Samseong Memory | Samsung | Korea | P | the price-setter, dumps capacity strategically |
| Kingstown | Kingston | US | V | modules, not dies; retail brand |
| Corsare | Corsair | US | P | enthusiast modules with heatsinks |
| G.Skillz | G.Skill | Taiwan | P | overclocker brand |
| Elpido | Elpida | Japan | V | merged, then bought — mid-game consolidation |

### NAND / storage (8)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Seagait | Seagate | US | P | HDD giant, slow to pivot |
| Westgate Digital | Western Digital | US | P | HDD then NAND, buys its way in |
| Toshira | Toshiba | Japan | P | invented NAND, poor at monetising it |
| Sandisko | SanDisk | US | V | cards & OEM NAND |
| Crucix | Crucial | US | V | retail SSD/DRAM, value tier |
| Invidia Storage | (fictional) | US | S | **fictional** NVMe controller startup |
| Optane Works | Intel Optane | US | S | premium, niche, discontinued |
| Platter & Co | Conner/Quantum | US | C | 1990s HDD also-rans, defunct by 2000 |

### Mobile silicon (6)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| **Snapmo** | Qualcomm | US | P | modem licensing tax, high-end Android |
| **Pomelo Silicon** | Apple | US | P | vertical integration, best efficiency |
| **Yexynos** | Samsung Exynos | Korea | V | in-house but inconsistent, thermal scandals |
| MediaCorp | MediaTek | Taiwan | V | value/mid-range volume playbook |
| Goshen Micro | Google Tensor | US | S | specialist — camera/compute, weak gaming |
| Brightsemi | Broadcom | US | S | connectivity IP, invisible giant |

### Power, analog & MCU (9)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Lone Star Instruments | Texas Instruments | US | P | analog + calculators + DSP |
| Anadev | Analog Devices | US | P | precision analog, industrial |
| Infinyon | Infineon | Germany | P | power semis, automotive |
| STX Micro | STMicroelectronics | EU | P | MCUs, MEMS, broad line |
| Omega Semi | ON Semiconductor | US | V | discrete power, commodity |
| Monolith Power | Monolithic Power | US | S | VRM specialist |
| Norvik Semi | Nordic | Norway | S | low-power wireless MCUs |
| Espressivo | Espressif | China | V | cheap WiFi MCUs, hobbyist invasion |
| NXQ | NXP | Netherlands | P | automotive, secure ID |

### Displays (6)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| LD Display | LG Display | Korea | P | OLED bet pays off late |
| Samseong Display | Samsung Display | Korea | P | OLED monopoly era |
| Aurora Opto | AUO | Taiwan | V | LCD price war survivor |
| BEO | BOE | China | C | state-subsidised capacity flood |
| Sharpe | Sharp | Japan | P | invented much, monetised little |
| Nippon Display | JDI | Japan | V | merged, then irrelevant |

### Batteries & power (8)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Panaso | Panasonic | Japan | P | cells for everyone, incl. rivals' cars |
| EL Chem | LG Chem | Korea | P | pouch cells, EV pivot |
| Cathay Power | CATL | China | P | scale + cost, dominates 2020s |
| Samseong SDI | Samsung SDI | Korea | P | prismatic + pouch |
| Murota | Murata | Japan | S | tiny cells, ceramics |
| Sonex Energy | Sony | Japan | P | invented Li-ion commercially, exits |
| DuraCell | Duracell | US | C | retail alkaline, brand-only |
| Voltaic Works | (fictional) | US | S | **fictional** solid-state startup, 2026 gamble |

### Cameras & optics (5)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Sonnar Optic | Sony Semi | Japan | P | sensor supremacy, sells to rivals |
| OmniSight | OmniVision | US/China | V | cheap sensors, huge volume |
| Hikvista | Hikvision | China | V | surveillance scale |
| Lumen Glass | Schott/Hoya | Japan | S | lens elements, invisible |
| Focal Point | (fictional) | Germany | P | **fictional** boutique optics, premium camera modules |

### Audio (6)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Bosé | Bose | US | P | ANC, marketing-led |
| Sennhauser | Sennheiser | Germany | P | engineering-led, thin margins |
| Harmon Cardon | Harman Kardon | US | P | licensing brand |
| JayBee Audio | JBL | US | V | pro + consumer volume |
| Realmtek | Realtek | Taiwan | C | integrated codecs, invisible volume |
| Alnico Sound | (fictional) | UK | S | **fictional** driver specialist, DIY channel |

### Networking (5)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Siscon | Cisco | US | E | enterprise default, high margin |
| Netgair | Netgear | US | V | retail routers |
| TP-Linc | TP-Link | China | C | price floor |
| Broadco | Broadcom | US | S | silicon behind everyone's box (see Brightsemi — merge if needed) |
| Meshcraft | Eero/Ubiquiti | US | S | **fictional**-ish mesh startup, enthusiast love |

### Devices & OEMs (22)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| **Pomelo** | Apple | US | P | vertical integration, premium, cult brand |
| Hewlin Packard | HP | US | P | enterprise + consumer, splits eventually |
| Dello | Dell | US | P | direct sales, B2B discipline |
| Lenova | Lenovo | China | V | buys a legend, wins on price |
| Asux | Asus | Taiwan | P | enthusiast boards, huge line-up |
| Acre | Acer | Taiwan | V | volume, thin margin |
| MSX | MSI | Taiwan | P | gaming brand |
| Gigabyt | Gigabyte | Taiwan | V | boards + cards |
| Razor | Razer | US | P | lifestyle markup on hardware |
| Alienworks | Alienware | US | P | boutique gaming, acquired |
| Xiaomy | Xiaomi | China | V | spec-per-rupee, community |
| Huawai | Huawei | China | P | telecom giant, sanctioned late game |
| Opo | Oppo | China | V | camera phones, offline retail |
| Vevo | Vivo | China | V | sibling of Opo |
| DuoPlus | OnePlus | China | P | enthusiast flagship killer |
| Nokio | Nokia | Finland | P | durability era, collapses on OS bet |
| Bramble | BlackBerry | Canada | E | keyboard, enterprise lock-in |
| Frond | Palm | US | S | PDA pioneer, fades |
| Commador | Commodore | Germany | V | 1990s decline, brand resurrection |
| Sinclare | Sinclair | UK | S | cheap home computers, cult status |
| Kyoto Toys | Nintendo | Japan | P | gameplay over specs, prints money |
| Sego | Sega | Japan | V | hardware exits, becomes publisher |

### Software & OS (10)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Microsift | Microsoft | US | P | OS licensing monopoly, then cloud |
| Pane OS | Windows | US | P | the default; compatibility is the moat |
| PomeloOS | macOS/iOS | US | P | vertical, premium, closed |
| DroidOS | Android | US | P | open licensing, fragmentation |
| Lynx | Linux | — | C | open commons; commodifies everyone |
| Bramble OS | BlackBerry OS | Canada | E | secure, invisible to consumers |
| Symbio | Symbian | UK | V | licensing chaos, dies slowly |
| Red Cap | Red Hat | US | E | support business model |
| Vapour | Steam | US | P | storefront power, 30% tax |
| Orakle | Oracle | US | E | enterprise licensing predators |

### Retail & distribution (5)
| Brand | Analog | Region | Tier | Note |
|---|---|---|---|---|
| Best Bargain | Best Buy | US | C | big-box, showrooming victim |
| Amazin | Amazon | US | P | logistics, destroys everyone's margin |
| FreshEgg | Newegg | US | C | DIY channel |
| Radio Hut | RadioShack | US | C | dies, then nostalgia revives it |
| Alibabo | Alibaba | China | P | B2B sourcing, price pressure |

### Fictional independents (12) — the player's real competition for "interesting"
| Brand | Segment | Region | Tier | Personality |
|---|---|---|---|---|
| Northbridge Labs | motherboards | US | S | engineer-owned, no marketing, loyalists only |
| Pale Blue | batteries | Norway | S | safety-first, expensive, EU contracts |
| Onyx Micro | MCUs | Taiwan | V | relentless cost-cutter |
| Halcyon Devices | laptops | UK | P | design-led, supply-chain fragile |
| Copperline | audio modules | UK | S | handmade, small volume, cult |
| Mica Works | SBCs | US | S | documentation obsession, education channel |
| Redshift Compute | servers | US | E | enterprise-only, no consumer brand |
| Tessellate | displays | Japan | S | microLED gamble |
| Basalt Systems | rugged devices | Germany | E | industrial, boring, profitable |
| Vantablack Audio | headphones | US | P | hype-driven, review-dependent |
| Cinder Robotics | drones/robots | China | V | fast follower |
| Kite & Anvil | accessories | India | C | volume, brand-light |

**Total: ~132 brands** (120 named + variants). Roughly 85% real-analogue, 15% fictional.

---

## 3. Brand data schema

```json
{
  "id": "imtel",
  "name": "Imtel",
  "realAnalog": "Intel",            // dev-only, never rendered
  "founded": 1968,
  "ended": null,
  "region": "US",
  "tier": "premium",
  "segments": ["cpu", "mpu", "fab"],
  "personality": {
    "aggression": 60, "innovation": 80, "efficiency": 70,
    "marketing": 75, "ethics": 55, "risk": 45
  },
  "traits": ["tick_tock_execution", "license_moat", "premium_pricing"],
  "crisisYears": [1994, 2018, 2021],   // FDIV-class scandals, node delays
  "startingCapital": 4.2e9,
  "gate": { "year": 1990, "requires": [] }
}
```

**Traits** are the important field: they let a brand behave recognisably without scripting every move. `tick_tock_execution` = alternates architecture/process years; `license_moat` = refuses to license x86; `premium_pricing` = never discounts below 15% margin. Six traits per brand, ~25 traits total, drives the whole rivalry sim.

**`crisisYears`** encodes the real scandals as *risk windows*, not cutscenes: a brand with a crisis year has elevated defect/probability that year. The Intel-analogue ships a faulty FPU in 1994 because its profile says so — and if the player has that brand's personality, so do they.

---

## 4. What brands must *not* become

- **Not stat blocks.** A brand is 6 personality numbers + 6 traits. If a brand needs a bespoke rule, that rule belongs in a trait.
- **Not all present at once.** `gate.year` and segment activation keep 1990 sparse: the CPU market has ~4 real players, the phone market has ~0. Density arrives with history.
- **Not uniformly competent.** Every segment needs at least one chronic underperformer and one overpriced incumbent, or the market has no texture.
- **Not legally sloppy.** `realAnalog` stays out of the build. For public release, trademark-search every name, and rename anything within edit-distance 1 of a live mark.
