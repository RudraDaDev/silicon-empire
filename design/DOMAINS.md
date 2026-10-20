# SILICON EMPIRE — Domain & Product Taxonomy

**Purpose:** define *what the player can make* and how the product catalogue coexists without becoming a list of unrelated toys.

> **Read `PRODUCTS.md` for the actual list: 175 products, 174 sellable.** This file covers the *relationships* (containment, channels, interfaces, OS). Its earlier category tables are now a narrative overview; where they disagree with `PRODUCTS.md`, `PRODUCTS.md` wins.

> **Variants are not products.** "8-bit MCU / 16-bit MCU / 32-bit MCU" is one product (`MCU`) with a gated spec. The same applies to wafer diameters, panel technologies, memory generations and OS platforms. Adding a catalogue entry that differs only by capability level is a modelling error.
Companions: `PLAN.md` (build plan), `BRANDS.md` (who else is in the market).

---

## 1. The model: one flat catalogue, one containment graph

**What we're building (the user's model).** A catalogue of 175 tech products (174 sellable + 1 internal), each with gated specs that expand into thousands of variants. Every single one is a real product you can design, manufacture and sell — *and* a component you can put inside other products you make. There is no hierarchy to climb and no tier you must graduate from.

A phone contains a battery pack, which contains cells and a BMS module. Those cells are also products you sell to other pack makers. That pack is also a product you sell to other phone makers. Same item, three businesses, and you can be in all three at once.

> **At every node in the graph, one decision: sell it, or consume it in something bigger?**
>
> And you can do both — sell to the market *and* build with it.

That's the whole game. "Which layers do you own" was my phrasing, and it was wrong: there are no layers. There is a set of products, a graph of *what contains what*, and a position (or several) you occupy in it.

```
        battery cell ──contains──┐
              │                  ▼
              ├──sold as──────► MARKET (other pack makers, B2B)
              │                  │
              └──contains──► battery pack ──contains──► phone ──sold──► CONSUMER
                                   │                        ▲
                                   ├──sold as──► MARKET      │
                                   │                        │
                              BMS module ───────────────────┘
                                   │
                                   └──sold as──► MARKET (other pack makers)
```

Notice the arrows go both ways. A pack maker buying your cells is a competitor you also supply. That's real (Sony sensors inside Apple phones) and it should emerge from the graph rather than be scripted.

**What replaces "layer".** Nothing, functionally. Two data fields do the work that "layer" was pretending to do:

| Field | Meaning | Used for |
|---|---|---|
| `contains[]` | inputs this product consumes | BOM, cost rollup, make-vs-buy |
| `sellsTo[]` | channels that will buy it (b2b, retail, enterprise, diy, carrier) | pricing, reviews, marketing |

A product with an empty `contains` is a raw input (silicon wafer, lithium feedstock). A product with an empty `sellsTo` is an internal-only intermediate. Most products have both, and **24 of the 109 are terminal consumer goods** — a phone has no parent, but it still has channels.

**Depth is derived, never authored.** If the UI wants to group the catalogue, it computes `depth = longest path to a terminal good` for sorting only. It must never gate anything. A player who spends 40 years making nothing but industrial BMS modules and sells them profitably has had a complete game — that's a legitimate strategy, not a starter tier.

**"Sell or consume" is a per-product toggle, at runtime, revisable annually.** Both states can be on simultaneously: a product line can ship 60% of its output to the market and route 40% into your own assembly. That split is a genuine strategic dial — supply your own devices cheaper while still earning from rivals, at the cost of arming your competitors.

**Ownership is fractional.** For any input in any recipe, three options: buy on the market at spot price (fast, no capex, exposed to price swings), lease capacity (commitment, better price), or build your own line (capex, margin, control, risk). Nothing is "unlocked" by tier — it's unlocked by cash and by whether you've researched the process.

## 2. Category catalogue

Columns: **Specs that matter** (the dials the player sets) · **Contains** (inputs it consumes) · **Era** (first plausible year in game) · **Sells to** (which channels buy it).

> The lettered headings **A–G are a reading aid for this document only.** They group the catalogue by what kind of thing it is, so a human can scan 109 rows. They are *not* a game system, not a progression path, and not stored in data. The only relationships the game knows are `contains[]` and `sellsTo[]`.

### A. Materials & process
| Product | Specs | Contains | Era | Sells to |
|---|---|---|---|---|
| Process node | feature size, D0, wafer cost, lithography class | equipment, R&D | 1990 | internal / foundry |
| Silicon wafer (150/200/300 mm) | diameter, purity, flatness | polysilicon | 1990 | B2B |
| Substrate (FR4 / ceramic / polyimide) | layers, Tg, cost | copper, resin | 1990 | B2B |
| Cover glass | thickness, toughness, coating | silica | 2007 | B2B |
| Rare-earth / lithium feedstock | grade, price volatility | mining | 1990 | commodity |

### B. Dies & chips
| Product | Specs | Contains | Era | Sells to |
|---|---|---|---|---|
| CPU die | cores, clock, IPC, cache, TDP, die area | node | 1990 | B2B + boxed |
| GPU die | shaders, clock, TFLOPS, bus width, TDP | node | 1995 | B2B |
| SoC (mobile/embedded) | cores, GPU class, modem, power | node, IP licenses | 2007 | B2B |
| MCU (8/16/32-bit) | core, flash, RAM, GPIO, peripherals, mA/MHz | node | 1990 | B2B |
| MPU / application processor | cores, MMU, cache, package | node | 1990 | B2B |
| FPGA / CPLD | LUTs, I/O, speed grade | node | 1990 | B2B |
| DRAM die | density, speed, timings, voltage | node | 1990 | B2B |
| NAND die | bits/cell (SLC→TLC→QLC), layers, endurance | node | 1995 | B2B |
| NOR flash / EEPROM | density, endurance | node | 1990 | B2B |
| PMIC | rails, current, efficiency, package | analog process | 1990 | B2B |
| BMS IC | cell count, balancing, protection thresholds | analog process | 1995 | B2B |
| Charging IC | protocol (USB-PD, QC), watts, efficiency | analog process | 2000 | B2B |
| Audio codec / DAC / amp | SNR, THD, channels, watts | analog process | 1990 | B2B |
| Camera sensor (CMOS) | MP, pixel size, ISO, fps, format | node, optics | 1995 | B2B |
| Display driver IC | channels, resolution support | node | 1995 | B2B |
| RF transceiver / modem | bands, throughput, power | node, IP | 1990 | B2B |
| Ethernet MAC/PHY | speed, ports, power | node | 1990 | B2B |
| USB / PCIe / SATA controller | gen, lanes, ports | node, IP | 1995 | B2B |
| Sensor IC (accel, gyro, mag, ALS, hall, baro) | range, resolution, mA | MEMS process | 2000 | B2B |
| Motor / LED driver | channels, current, voltage | analog process | 1990 | B2B |
| Security element / TPM | crypto suite, tamper resistance | node | 1995 | B2B |

### C. Packaging & test
| Category | Specs | Inputs | Era |
|---|---|---|---|
| Package type | pin count, thermal, cost, size | die, substrate, lead frame |
| Test & binning | coverage, bins, cost/unit | tester time |
| Stacking (PoP / TSV) | layers, bandwidth, yield penalty | dies, TSV process |

### D. Modules, power, storage, optics, audio, mechanical
| Product | Specs | Contains | Era | Sells to |
|---|---|---|---|---|
| **Battery cell — cylindrical** (18650/21700/26650) | chemistry, capacity mAh, voltage, cycle life, C-rate | cathode, anode, electrolyte, can | 1991 | B2B + retail |
| **Battery cell — prismatic** | chemistry, capacity, thickness, tabs | same | 1995 | B2B |
| **Battery cell — pouch** | chemistry, capacity, thickness, swelling risk | same + laminate film | 1999 | B2B |
| Battery pack | cell config (S/P), capacity Wh, BMS, form factor | cells, BMS, PCM | 1992 | B2B + B2C |
| BMS module | cell count, balancing, protection, comms | BMS IC, PCB, FETs | 1995 | B2B |
| Charging module (USB-PD/QC/wireless) | watts, protocols, efficiency, heat | charging IC, coil, PCB | 2000 | B2B + B2C |
| AC-DC adapter / PSU | watts, efficiency (80+), ripple, size | transformer, caps, ICs | 1990 | B2C |
| DC-DC / VRM module | in/out, amps, efficiency, phases | ICs, inductors, PCB | 1990 | B2B |
| Memory module (DIMM/SO-DIMM) | capacity, speed, latency, ECC | DRAM dies, PCB, SPD | 1990 | B2C |
| Graphics memory (VRAM) subsystem | capacity, GDDR gen, bus, bandwidth | DRAM dies, PCB | 1999 | B2B |
| SSD (SATA / NVMe / M.2) | capacity, controller, seq/rand IOPS, endurance, DRAM cache | NAND, controller, PCB | 2008 | B2C |
| eMMC / UFS module | capacity, standard version, speed | NAND, controller | 2005 | B2B |
| SD / microSD / USB flash | capacity, class, speed | NAND, controller | 2000 | B2C |
| HDD | capacity, RPM, cache, platters, seek | platters, motor, heads | 1990 | B2C |
| Optical drive | format (CD/DVD/BD), speed | laser, motor | 1992 | B2C |
| GPIO expander / I/O expander | pins, interface (I²C/SPI), interrupt | IC, package | 1995 | B2B |
| USB hub / PCIe switch / MUX | ports, lanes, power | ICs, PCB | 1998 | B2B |
| Level shifter / logic module | channels, voltage range, speed | ICs | 1990 | B2B |
| Connector (USB-C, HDMI, barrel, JST, GPIO header) | pins, rating, mating cycles | metal, plastic | 1990 | B2B |
| Relay / MOSFET / driver module | voltage, current, isolation | ICs, PCB | 1990 | B2B |
| **LCD panel** | size, resolution, ppi, brightness, contrast, response | glass, backlight, driver | 1990 | B2B |
| **OLED panel** | size, resolution, brightness, lifetime, burn-in | organics, driver | 2007 | B2B |
| microLED panel | size, ppi, brightness, yield | LED dies, backplane | 2020 | B2B |
| Backlight / touch digitizer / cover glass assembly | nits, touch tech, thickness | LEDs, film, glass | 1995 | B2B |
| **Camera module** (sensor + lens + ISP) | MP, aperture, OIS, focus, low-light | sensor, lens, actuator | 2000 | B2B |
| Lens / IR filter / flash module | elements, f-stop, coating | glass, LEDs | 1998 | B2B |
| **Speaker driver** | size, watts, impedance, sensitivity, Fs | magnet, coil, diaphragm | 1990 | B2B + B2C |
| Speaker module / enclosure | watts, tuning, enclosure volume | driver, box | 1990 | B2C |
| Microphone (electret / MEMS) | SNR, sensitivity, directionality | MEMS die, port | 1995 | B2B |
| Buzzer / piezo | SPL, frequency, voltage | piezo disc | 1990 | B2B |
| Heatsink / heatpipe / vapor chamber | thermal resistance, mass, cost | aluminium, copper | 1995 | B2C |
| Fan (axial / blower) | airflow, static pressure, dB, bearing | motor, blades | 1990 | B2C |
| Liquid cooler (AIO) | radiator size, pump, dB | pump, tubing | 2010 | B2C |
| Thermal pad / paste | conductivity, thickness | compounds | 1995 | B2C |
| Enclosure / chassis / monitor stand | volume, material, finish, rigidity | sheet metal, plastic | 1990 | B2C |
| Keyboard / trackpad / buttons / switches | travel, actuation, lifecycle, feel | switches, PCB | 1990 | B2C |
| Hinge / gasket / screw / bracket | torque, cycles, tolerance | metal, rubber | 1990 | B2B |
| PCB / PCBA | layers, size, assembly class | substrate, components | 1990 | B2B |

### E. Devices
| Category | Specs | Era | Channel |
|---|---|---|---|
| Desktop PC / workstation | CPU, GPU, RAM, storage, PSU, form factor | 1990 | retail + OEM |
| Motherboard | socket, chipset, slots, VRM, I/O | 1990 | retail |
| GPU card | die, VRAM, cooler, TDP, outputs | 1999 | retail |
| Laptop | CPU, panel, battery Wh, weight, thickness, keyboard | 1990 | retail + enterprise |
| Smartphone | SoC, panel, camera, battery, OS, thickness | 2007 | carrier + retail |
| Feature phone | SoC class, keypad, battery days | 1994 | carrier |
| Tablet | SoC, panel size, pen, battery | 2010 | retail |
| **SBC** (single-board computer) | SoC, RAM, GPIO header, price, community | 2005 | DIY + education |
| MCU dev board | MCU, headers, debug, price | 1995 | DIY + education |
| Console / handheld | SoC, GPU, storage, price, ecosystem | 1990 | retail |
| Smartwatch / wearable | SoC, panel, battery, sensors | 2013 | retail |
| Earbuds / headphones | driver, ANC, battery, codec | 2000 | retail |
| Speaker / soundbar | drivers, watts, connectivity | 1990 | retail |
| Monitor / TV / projector | panel, resolution, HDR, ports | 1990 | retail |
| Router / switch / access point | radios, ports, throughput, firmware | 1995 | retail + ISP |
| NAS / server | CPU, bays, RAM, redundancy | 1995 | enterprise |
| Camera (DSLR/mirrorless/action) | sensor, mount, video, burst | 1995 | retail |
| Printer / scanner / 3D printer | resolution, speed, consumables | 1990 | retail |
| Keyboard / mouse / gamepad / webcam | sensor, switches, latency | 1990 | retail |
| Power bank / charger / cable | Wh, watts, protocols, safety | 2000 | retail |
| UPS / surge / battery backup | VA, runtime, transfer time | 1990 | retail |
| Drone / robot / automation kit | motors, controller, battery, payload | 2010 | retail + industrial |
| Automotive infotainment / dashcam | SoC, panel, thermal range | 2005 | B2B |
| Phone case / protector / stand | material, drop rating, fit | 2008 | retail |

### F. Software
| Category | Specs | Era |
|---|---|---|
| Desktop OS | kernel, arch support, GUI, driver coverage, apps, license model | 1990 |
| Mobile OS | touch UI, app ecosystem, battery policy, update cadence | 2007 |
| Embedded OS / RTOS | footprint, determinism, toolchain, per-unit cost | 1990 |
| Server OS | scale, security, virtualization | 1995 |
| BIOS / UEFI / firmware | boot speed, features, security | 1990 |
| Drivers | coverage, stability, perf | 1990 |
| App store / ecosystem | catalogue size, developer share, curation | 2008 |
| Productivity / creative suite | features, compatibility, price | 1990 |
| Developer tools / compilers | languages, perf, price | 1990 |
| Security suite | detection, footprint, price | 1995 |

### G. Services
| Category | Specs | Era |
|---|---|---|
| Retail store | locations, footfall, margin, staffing | 1990 |
| Online store | reach, logistics, returns | 1998 |
| OEM contract | volume, spec, price, penalty clauses | 1990 |
| Foundry service (sell your fab) | node, capacity, yield offered, price/wafer | 1990 |
| IP licensing (sell your designs) | per-unit royalty, term, exclusivity | 1990 |
| Support / warranty plan | coverage, response, cost | 1990 |
| Cloud / hosting service | capacity, uptime, price | 2006 |
| Repair network | coverage, turnaround, cost | 1990 |

### Catalogue count (authored, not aspirational)

| Group | Sellable products | Internal-only | Notes |
|---|---|---|---|
| A. Materials & process | 4 | 1 | Process node is sold as *capacity* (see G), not as a product |
| B. Dies & chips | 21 | 0 | every chip is sellable B2B |
| C. Packaging & test | 3 | 0 | sold as contract assembly / test service |
| D. Modules, power, storage, optics, audio, mechanical | 38 | 0 | the largest group; all sellable |
| E. Devices | 24 | 0 | the only terminal consumer goods |
| F. Software | 10 | 0 | OS counts; see §6 |
| G. Services | 8 | 0 | sellable by definition |
| **Total** | **108** | **1** | **109 rows authored** |

**108 of 109 things in the catalogue can be sold.** Only the process node itself isn't a product — and its output is, via foundry capacity.

To reach the ~130 target, the remaining ~20 rows are: EDA software, fab equipment (lithography/etch/deposition tools — see open question), test equipment, touch controller, haptics driver, GPS/GNSS module, NFC module, fingerprint sensor, LED lighting module, solar cell, cable/adaptor range, heatsink compound variants, remote management software, game engine, office suite, antivirus, backup software, and 3–4 late-era categories.

**One category is not one SKU.** A pouch cell across 3 chemistries × 6 capacities × 2 thicknesses is 36 SKUs from one row. Categories are what you *design*; SKUs are what you *sell*. Realistic playable SKU count at M5: low thousands, generated from ~130 schemas.

---

## 3. One product framework, not 130 systems

The mistake would be code per category. Instead: **a product is a row in a catalogue schema, and the catalogue is a graph.**

```json
// data/catalog/battery-cell-pouch.json
{
  "id": "battery_cell_pouch",
  "name": "Pouch Cell",
  "era": 1999,
  "contains":  ["cathode_mat", "anode_mat", "electrolyte", "laminate_film"],
  "containsQty": { "cathode_mat": 0.004, "anode_mat": 0.003, "electrolyte": 0.002 },
  "sellsTo":  ["b2b", "diy"],          // who buys it. empty array = internal-only
  "specs": [
    { "id": "chemistry", "type": "enum",   "options": ["LiCoO2","NMC","LFP"] },
    { "id": "capacity",  "type": "number", "unit": "mAh", "min": 300, "max": 6000 },
    { "id": "thickness", "type": "number", "unit": "mm",  "min": 2,   "max": 12 }
  ],
  "derived": {
    "energyWh": "capacity * nominalVoltage / 1000",
    "costPerWh": "inputCost / energyWh * (1 + scrapRate)"
  },
  "marketSegments": ["consumer_devices", "power_tools", "ev_storage"]
}
```

And a consumer product that consumes it — the only structural difference is which lists are populated:

```json
// data/catalog/power-bank.json
{
  "id": "power_bank",
  "name": "Power Bank",
  "era": 2007,
  "contains": ["battery_cell_pouch", "charging_module", "pcba", "enclosure"],
  "sellsTo": ["retail", "b2b"],
  "specs": [
    { "id": "capacityWh", "type": "number", "unit": "Wh", "min": 5, "max": 300 },
    { "id": "maxWatts",   "type": "number", "unit": "W",  "min": 2.5, "max": 240 },
    { "id": "ports",      "type": "number", "min": 1, "max": 6 }
  ]
}
```

**Rules that keep this honest:**
- **Any product may contain any product.** Legality is not enforced by a tier — it's enforced by the recipe: if `battery_cell_pouch` lists `electrolyte` in `contains`, then electrolyte is an input to it. There is no "you can't put that there" rule except physical absurdity, which is caught by validation (a `contains` entry must exist in the catalogue and its `era` must precede the parent's).
- `specs` are the only dials the designer UI shows — the screen is generated from the schema, so a new product gets a working design screen for free.
- `sellsTo: []` marks an internal-only intermediate. Everything else is a shippable product, including dies, substrates, modules, OS licences and retail services.
- `marketSegments` decouples "what it is" from "who wants it". One pouch cell sells to phones, power banks and drones.
- Validation: one JSON Schema for all products, plus `tools/validate-data.mjs` refusing to boot on malformed data, duplicate ids, **dependency cycles** (A contains B contains A), and orphaned `contains` references. Without this, 130 products become 130 silent bugs.

**Adding a product later = one JSON file + one test row.** That is the entire promise of "make anything".

### 3a. Sell or consume — the one mechanic that ties the graph together

Every product line carries a runtime split:

```
battery_cell_pouch ──┬── 60% → market  (revenue, at spot price)
                     └── 40% → own pack assembly (cost saving, no revenue)
```

- **Sell-only** — maximise cash now, arm competitors, keep utilisation high.
- **Consume-only** — cheaper inputs for your own devices, no external revenue, all risk internal.
- **Both** — the interesting default. Tune the split as markets move.

Rules that make this strategic rather than dominant:
- Consumed inputs are valued at **your marginal cost**, not market price. That's the entire margin advantage of integration — and it's real only if your line is efficient.
- Selling to rivals raises their quality and *reveals your capability* (they may then build a competing line).
- Consuming your own output means **no market feedback**: no reviews, no channel data, no brand growth from that unit.
- If your line is worse than the market's best, consuming it *hurts* your device — a real cost of forced integration.

 This single mechanic is what makes 109 products one game instead of 109 businesses.

## 4. Compatibility & interfaces

"Make anything" collapses without compatibility, because everything becomes interchangeable. So interfaces are first-class and date-gated:

| Interface family | Versions over time | Gates |
|---|---|---|
| Memory | SIMM → DIMM → DDR → DDR2/3/4/5, LPDDR | which DRAM fits which board |
| Storage | IDE → SATA → NVMe (PCIe gen) | SSD ↔ device |
| Bus | ISA → PCI → AGP → PCIe 1.0→6.0 | GPU ↔ motherboard |
| Power delivery | barrel → USB-BC → QC → USB-PD 1/2/3 → PPS | charger ↔ device watts |
| Display | VGA → DVI → HDMI 1.x→2.1 → DP | panel ↔ device |
| Radio | 2G → 3G → 4G → 5G (bands) | phone ↔ carrier market |
| Battery form | cylinder → prismatic → pouch, connector pinout | cell ↔ pack ↔ device |
| CPU socket | Socket 3/7/370/478/775/115x/AMx | CPU ↔ motherboard |
| Wireless charging | Qi 5W → 15W → mag-snap | charging module ↔ device |

A device has **slots**; components have **interfaces**. Mismatch is blocked in the designer with a plain-language reason (`This board takes DDR2 — this module is DDR4`). That single sentence is the difference between depth and frustration.

**The interesting bit:** interface transitions are *market events*. When USB-C arrives, every existing product line needs a redesign, and rivals who bet early win the transition. That's free drama generated by the data model.

---

## 5. Batteries, in detail (because they're the clearest example of depth)

Batteries are the clearest demonstration of the graph model: chemistry × form factor × pack engineering, all date-gated, and every stage is simultaneously a product you can sell and an input you can consume.

**Chemistry timeline**
| Chemistry | Era | Energy (Wh/kg) | Cycles | Safety | Notes |
|---|---|---|---|---|---|
| NiCd | 1990 | 45 | 500 | medium | memory effect, cheap, heavy |
| NiMH | 1991 | 80 | 500 | medium | better density, self-discharge |
| Li-ion (LiCoO₂) | 1992 | 150 | 500 | low | the industry shift |
| Li-poly (pouch) | 1999 | 170 | 500 | low | thin devices, swelling risk |
| NMC | 2008 | 200 | 1000 | medium | mainstream phones/EV |
| LFP | 2010 | 120 | 3000 | high | heavy but safe, cheap per cycle |
| Solid-state (late) | 2026+ | 300 | 1500 | high | milestone gamble |

**Form factors:** cylindrical (robust, cheap, poor packing), prismatic (good packing, heavier can), pouch (thinnest, lightest, swelling and puncture risk). Each has a *fit* constraint against device volume — which is why thin phones and big batteries fought each other for 20 years.

**Three products in one chain, three businesses — and you can run all three at once:**
- **Cell** — capital-heavy, thin margin, commodity, huge volume. Sell to everyone, including your own pack line.
- **Pack** — engineering margin: cell config, BMS, thermal, connectors. Sell to device makers *and* consume in your own phone.
- **BMS module** — high margin per unit, tiny volume, sells to other pack makers (who may be your competitors).

A player who only ever makes BMS modules is running a complete, viable business. A player who starts there and later adds packs and cells is doing vertical integration because the *margin maths* pulled them into it — not because a tier unlocked. Either is a full game.

**Danger mechanic:** under-spec safety on a pouch cell + fast charging → thermal event. Recalls are expensive, but a *deliberate* cheap-chemistry strategy for the budget segment is legitimate play. Moral/quality trade-offs should be economically real, not moralised at the player.

---

## 6. OS as a first-class system

An OS is a product with unusual economics, so it gets its own rules.

**Attributes:** kernel type (monolithic / micro / hybrid), supported architectures, UI paradigm (CLI → GUI → touch), driver coverage, stability, security posture, app ecosystem size, update cadence, **license model**.

**License models** — the strategic fork:
| Model | Per-unit cost | Control | Player experience |
|---|---|---|---|
| Proprietary per-unit | $15–80 | own it | high margin, must win share; rivals may refuse to license |
| Open source + support | ~0 | shared | commoditises rivals' products, earns on services |
| Vertically locked | 0 | total | best performance/margin on *your* devices only |
| Licensed to others | 0 (you collect) | partial | pure revenue, weakens your differentiation |

**Ecosystem network effect:** `ecosystem = f(installBase, developerSatisfaction, yearsShipping)`. Apps follow share, and share follows apps. This is the moat that made Windows and Android unbeatable, and it must be modelled — otherwise every OS competes in a frictionless vacuum and the history is unrecognisable.

**Device ↔ OS coupling:**
- A device with no OS is unusable. With a badly-matched OS: -quality, -drivers, -reviews.
- Shipping your own OS on your own hardware: +performance, +margin, but +R&D burn and a cold-start ecosystem.
- Licensing a rival's OS: fast to market, -margin, and your rival knows your unit volumes.

**Failure modes worth having:** shipping a phone with an OS that has no apps (review tank), shipping an OS with no hardware (no revenue), forcing your OS onto an unwilling market (antitrust event), and supporting x86-only while the world moves to ARM (a real 2010s lesson).

---

## 7. Channels change the game, not just the price

Same product, different buyers:

| Channel | Cares about | Ignores | Margin | Volume |
|---|---|---|---|---|
| **OEM / B2B** | spec, reliability, price, supply security | brand, packaging | low | huge |
| **Retail / B2C** | brand, reviews, design, price | datasheet minutiae | high | medium |
| **Enterprise** | support, warranty, lifecycle, security | styling | medium | medium |
| **DIY / enthusiast** | documentation, community, openness, price/perf | polish | medium | small |
| **Carrier / ISP** | certification, volume pricing, subsidies | everything else | low | large |

This is why "modules" are a legitimately different game from "phones": the GPIO expander player wins on reliability and price with zero marketing, while the phone player spends 12% of revenue on brand. **A player who tries to market a GPIO expander will learn that channels are real.**

---

## 8. Excluded by design

The user excluded **medical** and **AI**. Enforced structurally, not by good intentions:
- No category carries the `medical` or `ai` tag; `tools/lint-domains.mjs` fails the build if either appears.
- No "accelerator/NPU/TPU" product categories. GPUs remain a *graphics* category.
- No "AI assistant" software, no AI-driven market modifiers.
- Adjacent-but-allowed: camera sensors, computational photography as a camera feature, ML-flavoured marketing copy on an OS — feature text, not an AI product line.

Why it matters mechanically: AI accelerators would otherwise dominate the 2020s economy and flatten the whole late game into one race. Keeping them out keeps the 1990–2026 arc about silicon, systems and supply chains.

---

## 9. Activation — how 130 products ship without a 5-year build

All 109 products (target ~130) and 132 brands exist as **data** from day one. *Activation* is what the player can interact with, and it grows.

| Milestone | Products made playable | Player story |
|---|---|---|
| **M1 — Slice** | ~8: CPU die, process node, package, PCBA, memory module, motherboard, desktop PC, one OS licence | "I design a CPU, pick a node, build a PC, price it, rivals react" |
| **M2 — Silicon breadth** | ~20: + GPU die, DRAM/NAND dies, MCU, PMIC, more packages | "I can be a fabless designer or an IDM" |
| **M3 — Systems** | ~45: + battery cells/packs/BMS/charging, panels, camera modules, audio, cooling | "I build a phone out of my own parts and sell the parts to rivals" |
| **M4 — Devices & software** | ~90: + laptops, phones, SBCs, consoles, wearables, routers, TVs, shippable OS | "I ship my own OS on hardware I also make" |
| **M5 — Everything** | 109 authored (target ~130): + services, OEM contracts, IP licensing, retail, remaining products | "I sell silicon, systems and software — and I sell to my competitors" |

**Deactivation ≠ gating by tier.** At M1 a player simply can't *see* the phone designer yet; nothing stops them from eventually making phones, batteries or BMS modules in any order. There is no ladder — the catalogue just fills in as systems get built. Rivals are already selling the whole range in 1995, so the market is always bigger than the player's product line. That contrast is the point.

**Order-of-work rule:** each milestone adds *one* new mechanic (M3 adds the sell/consume split; M4 adds OS coupling), and everything else is data authoring. If a milestone needs two new mechanics, split the milestone.

## 10. What this costs, honestly

- **Data volume**: 130 categories × ~6 specs + ~120 brands + ~400 tech nodes ≈ 3–5k rows of JSON. Manageable *only* with schema validation and generated UI. Without those, it's unmaintainable by M3.
- **Balance surface**: each category needs its own cost/price curve or the economy drifts. Mitigation: shared margin bands per channel + a `tools/balance.mjs` sweep that flags any category outside ±1σ of its channel's norm.
- **Review/quality logic**: must be generic (`quality = f(specs vs segment expectations, brand, price)`) or you'll write 130 bespoke reviews.
- **The real risk**: scope. §9 makes every milestone *shippable*, which is the only defence. Nothing here is safe to build in one go.
