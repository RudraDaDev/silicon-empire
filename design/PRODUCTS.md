# SILICON EMPIRE — Product Catalogue (v2)

**Three things, kept strictly separate.** Earlier drafts confused them; this file doesn't.

| Thing | What it is | Lives in | Count |
|---|---|---|---|
| **Product** | A thing with a designer: specs, inputs, a buyer | Catalogue (JSON) | ~166 |
| **Variant** | A gated value of one spec: `bitWidth: 16`, `panelTech: OLED` | Chosen *during design* | thousands |
| **SKU** | A product with every spec decided, priced and named | The market | tens of thousands over a run |

**The rule:** if two rows would share inputs and differ only by *capability level or technology*, they are **one product with a gated spec** — not two products.

So there is no "8-bit MCU" and "16-bit MCU". There is **MCU**, and bit width is a spec you choose:

```
MCU  ──►  Bit width   [ 8-bit  ✓ 1990 ]  [ 16-bit  ▲ needs "16-bit core" ]  [ 32-bit  🔒 1996 ]
          Flash       [ 4 KB ──────────────●──────── 512 KB ]
          Peripherals [ timers, UART, SPI, CAN, ADC ]
```

Research the core, and 16-bit lights up *inside the same product*. Your designs stay comparable, and the tech tree becomes the thing that widens your options rather than spawning near-duplicate catalogue entries.

---

## A · Materials & process · 6 (5 sellable)

| ID | Product | Variant axis | Era | Sells to |
|---|---|---|---|---|
| A1 | Silicon wafer | diameter 150/200/300 mm | 1990–2001 | B2B |
| A2 | Substrate | FR4 / ceramic / polyimide; layer count | 1990 | B2B |
| A3 | Cover glass | thickness, toughness, coating | 2007 | B2B |
| A4 | Lithium feedstock | grade, purity | 1992 | commodity |
| A5 | Rare-earth feedstock | grade, oxide mix | 1990 | commodity |
| A6 | 🔒 Process node | feature size, lithography class | 1990 | — (sold as G4) |

## B · Silicon · 30

| ID | Product | Variant axis | Era | Sells to |
|---|---|---|---|---|
| B1 | MCU | **bit width 8/16/32**, flash, peripherals, mA/MHz | 1990 | B2B |
| B2 | Application processor | cores, MMU, cache, package | 1990 | B2B |
| B3 | CPU die | **ISA x86/ARM/RISC-V** (licence-gated), cores, cache, IPC | 1990 | B2B + boxed |
| B4 | DSP | MACs, precision, clock | 1990 | B2B |
| B5 | PLD (FPGA/CPLD) | **density class**, LUTs, I/O, speed grade | 1990 | B2B |
| B6 | GPU die | **architecture gen** fixed→unified→compute, shaders, bus | 1995 | B2B |
| B7 | Display / frame-buffer controller | resolution, memory type | 1990 | B2B |
| B8 | Video codec IC | **codec set** (MPEG-2/4, H.264, HEVC) | 1995 | B2B |
| B9 | SoC | **target class** mobile/embedded/wearable/auto, cores, GPU class | 2005 | B2B |
| B10 | DRAM die | **generation** SDR/DDR2/3/4/5+LPDDR, density, speed | 1990 | B2B |
| B11 | SRAM die | density, speed, voltage | 1990 | B2B |
| B12 | NAND die | **bits/cell** SLC→TLC→QLC, layers, endurance | 1995 | B2B |
| B13 | NOR / EEPROM die | density, endurance, interface | 1990 | B2B |
| B14 | PMIC | rails, current, efficiency | 1990 | B2B |
| B15 | BMS IC | cell count, balancing, protection thresholds | 1995 | B2B |
| B16 | Charging IC | **wired/wireless**, protocol set, watts, efficiency | 2000 | B2B |
| B17 | Discrete power | **type** MOSFET/IGBT/regulator/diode, rating | 1990 | B2B |
| B18 | Analog IC | **function** op-amp/ADC/DAC/comparator, bits, speed | 1990 | B2B |
| B19 | Driver IC | **type** motor/LED/relay, channels, current | 1990 | B2B |
| B20 | Audio IC | **type** DAC/codec/class-D amp, SNR, channels | 1990 | B2B |
| B21 | Image sensor | **tech** CCD/CMOS, MP, pixel size, ISO | 1990 | B2B |
| B22 | Motion sensor | **type** accel/gyro/IMU/magnetometer, range, mA | 2000 | B2B |
| B23 | Environmental sensor | **type** light/hall/baro/humidity, resolution | 2000 | B2B |
| B24 | Fingerprint sensor IC | optical/capacitive/ultrasonic, FAR/FRR | 2013 | B2B |
| B25 | Touch controller IC | channels, multi-touch, report rate | 2007 | B2B |
| B26 | Display driver IC | channels, resolution, interface | 1995 | B2B |
| B27 | RF transceiver | bands, power, noise figure | 1990 | B2B |
| B28 | Cellular modem | **generation** 2G/3G/4G/5G, bands, throughput | 1995 | B2B |
| B29 | Wireless connectivity IC | **protocol** Wi-Fi/BT/Zigbee/Thread/UWB, version | 2000 | B2B |
| B30 | GNSS receiver IC | constellations, channels, accuracy | 2000 | B2B |
| B31 | NFC controller | modes, range, security | 2010 | B2B |
| B32 | Ethernet MAC/PHY | **speed** 10M/100M/1G/10G, ports | 1990 | B2B |
| B33 | Bus controller IC | **protocol+gen** USB/PCIe/SATA/NVMe | 1996 | B2B |
| B34 | SSD controller | channels, DRAM cache, interface gen | 2008 | B2B |
| B35 | Security IC | **type** TPM/secure element/crypto accel, suite | 1995 | B2B |

## C · Packaging & test · 2

| ID | Product | Variant axis | Era | Sells to |
|---|---|---|---|---|
| C1 | Packaging service | **package type** QFP/BGA/flip-chip/PoP/TSV, pin count | 1990 | B2B |
| C2 | Test & binning service | coverage, bins, throughput | 1990 | B2B |

## D · Modules & components · 52

| ID | Product | Variant axis | Era | Sells to |
|---|---|---|---|---|
| D1 | Cylindrical cell | **chemistry** NiCd/NiMH/Li-ion + **size** 18650/21700/26650, capacity | 1990 | B2B + retail |
| D2 | Prismatic cell | chemistry, capacity, can material | 1995 | B2B |
| D3 | Pouch cell | chemistry, capacity, thickness, laminate | 1999 | B2B |
| D4 | Solid-state cell | chemistry, capacity, cycle life | 2026 | B2B |
| D5 | Battery pack | **form/segment** device/consumer/industrial/UPS, cell config S×P | 1992 | B2B + B2C |
| D6 | BMS / protection module | **mode** full BMS / protection-only, cell count, comms | 1995 | B2B |
| D7 | Charging module | **type** AC-DC / USB-PD / GaN / wireless pad, watts | 2000 | B2B + B2C |
| D8 | DC-DC / VRM module | input, output, amps, phases | 1990 | B2B |
| D9 | Supercapacitor module | capacitance, voltage, ESR | 2012 | B2B |
| D10 | LED lighting module | lumens, CRI, power | 2005 | B2C |
| D11 | Solar panel | chemistry, watts, efficiency | 1995 | B2C + B2B |
| D12 | Memory module | **form** SIMM/DIMM/SO-DIMM + **ECC on/off**, capacity, speed | 1990 | B2C |
| D13 | VRAM subsystem | capacity, GDDR gen, bus width | 1999 | B2B |
| D14 | SSD | **interface** SATA/NVMe + **class** consumer/enterprise, capacity, endurance | 2008 | B2C |
| D15 | Embedded storage module | **standard** eMMC/UFS, capacity, speed | 2005 | B2B |
| D16 | Flash card | **form** SD/microSD/CF/USB, capacity, class | 1994 | B2C |
| D17 | HDD | **form** 3.5"/2.5" + **tech** air/helium, capacity, RPM | 1990 | B2C |
| D18 | Optical drive | **format** CD/DVD/Blu-ray, speed | 1992 | B2C |
| D19 | Tape drive | format, capacity, transfer rate | 1990 | B2B |
| D20 | Floppy drive | capacity, interface | 1990 | B2C |
| D21 | Interface module | **function** GPIO expander/level shifter/USB hub/PCIe switch/MUX | 1990 | B2B + DIY |
| D22 | Connector | **type** USB-C/USB-A/HDMI/DP/barrel/JST/header/socket, rating | 1990 | B2B |
| D23 | Relay module | **type** electromechanical/SSR, contacts, coil | 1990 | B2B |
| D24 | Driver module | **type** motor/stepper/servo, current, interface | 1990 | DIY + B2B |
| D25 | Isolation module | **type** opto/digital, channels, speed | 1990 | B2B |
| D26 | Wireless module | **protocol** BT/Wi-Fi/Zigbee/LoRa + **module vs chip-down**, range | 2002 | DIY + B2B |
| D27 | Cellular module | **generation** 2G/LTE/5G, form factor | 2000 | B2B |
| D28 | GNSS module | constellations, antenna, accuracy | 2002 | DIY + B2B |
| D29 | Sensor module | **sensor type**, breakout/form-factor, connector | 2005 | DIY + B2B |
| D30 | Display breakout module | tech, size, interface | 2008 | DIY |
| D31 | Keypad / button module | membrane/mechanical, keys, backlight | 1990 | DIY + B2B |
| D32 | Buzzer / alarm module | SPL, frequency, driver | 1990 | B2B |
| D33 | PoE module | standard, watts, isolation | 2005 | B2B |
| D34 | Power distribution board | rails, current, fusing | 1995 | B2B |
| D35 | Display panel | **tech** mono LCD/TFT/IPS/OLED/AMOLED/microLED/e-ink/plasma, size, ppi, nits | 1990 | B2B |
| D36 | Backlight unit | light source, nits, uniformity | 1995 | B2B |
| D37 | Touch digitizer | resistive/capacitive, size, multi-touch | 2007 | B2B |
| D38 | Laminated display assembly | lamination method, thickness, glass choice | 2008 | B2B |
| D39 | Camera module | **sensor+features** CCD/CMOS, MP, OIS, multi-cam, ToF | 1995 | B2B |
| D40 | Lens element | elements, f-stop, coating, material | 1998 | B2B |
| D41 | IR filter | cut wavelength, transmission | 2000 | B2B |
| D42 | Flash module | LED/xenon, lumens, CCT | 2002 | B2B |
| D43 | OIS actuator | travel, response, power | 2012 | B2B |
| D44 | LiDAR module | range, points/s, wavelength | 2019 | B2B |
| D45 | Speaker driver | **type** dynamic/balanced-armature/piezo, size, watts, Fs | 1990 | B2B + B2C |
| D46 | Speaker module / enclosure | enclosure volume, tuning, watts | 1990 | B2C |
| D47 | Microphone | **type** electret/MEMS, SNR, directionality | 1990 | B2B |
| D48 | Haptic actuator | **type** ERM/LRA/piezo, force, response | 2012 | B2B |
| D49 | ANC module | attenuation dB, latency, power | 2008 | B2B |
| D50 | Heat spreader | **type** heatsink/heatpipe/vapor chamber, thermal resistance | 1990 | B2C |
| D51 | Fan | **type** axial/blower, size, airflow, dB | 1990 | B2C |
| D52 | Liquid cooler (AIO) | radiator size, pump, dB | 2010 | B2C |
| D53 | Thermal interface material | **type** paste/pad/liquid metal, conductivity | 1995 | B2C |
| D54 | Enclosure / chassis | form factor, material, finish, volume | 1990 | B2C |
| D55 | Stand / mount | VESA pattern, articulation, load | 1995 | B2C |
| D56 | Keyboard assembly | **type** membrane/mechanical/scissor, rows, backlight | 1990 | B2C |
| D57 | Trackpad assembly | size, glass, haptics | 1995 | B2C |
| D58 | Switch / button part | membrane/mechanical, travel, actuation force, life | 1990 | B2C |
| D59 | Hinge / mechanical part | **part type** hinge/gasket/fastener, torque, cycles | 1990 | B2B |
| D60 | PCB | layers, size, material, finish | 1990 | B2B |
| D61 | PCBA assembly service | SMT class, component count, yield | 1990 | B2B |

## E · Devices · 48

| ID | Product | Variant axis | Era | Sells to |
|---|---|---|---|---|
| E1 | Desktop PC | **class** home/workstation/gaming/AIO/mini, form factor | 1990 | retail + OEM |
| E2 | Motherboard | **socket+chipset gen**, slots, VRM, form factor | 1990 | retail |
| E3 | GPU card | GPU die, VRAM, cooler, TDP, outputs | 1999 | retail |
| E4 | Expansion card | **type** sound/network/capture, interface gen | 1990 | retail |
| E5 | Laptop | **class** consumer/business/ultrabook/gaming/rugged, size, battery Wh | 1990 | retail + enterprise |
| E6 | Phone | **class** feature/smart/phablet, SoC, panel, camera, battery | 1994 | carrier + retail |
| E7 | Tablet | size class, SoC, panel, pen support | 2010 | retail |
| E8 | E-reader | panel tech, size, front light | 2004 | retail |
| E9 | PDA | screen, keyboard, OS | 1993 | retail |
| E10 | Wearable | **type** smartwatch/fitness band/glasses, SoC, sensors | 2009 | retail |
| E11 | VR headset | **type** tethered/standalone, panels, tracking | 2016 | retail |
| E12 | Camera | **type** compact/DSLR/mirrorless/action/camcorder, sensor, mount | 1990 | retail |
| E13 | Drone | class, flight time, camera, controller | 2010 | retail |
| E14 | Robot kit | chassis, motors, controller, sensors | 2010 | retail + education |
| E15 | Single-board computer | SoC, RAM, GPIO header, price tier | 2005 | DIY + education |
| E16 | Dev board | **type** MCU/FPGA/SBC-HAT, headers, debug, price | 1995 | DIY + education |
| E17 | Console | **form** home/handheld/mini-retro, SoC, storage, price | 1990 | retail |
| E18 | Set-top / streaming box | **form** box/stick, SoC, wireless | 1995 | retail + ISP |
| E19 | Monitor | size, panel, resolution, refresh, ports | 1990 | retail |
| E20 | Television | size, panel, resolution, HDR, tuner | 1990 | retail |
| E21 | Projector | **tech** LCD/DLP/laser, lumens, resolution | 1995 | retail |
| E22 | Earbuds / headphones | **form** wired/TWS, **type** in-ear/over-ear, ANC | 1990 | retail |
| E23 | Speaker | **form** portable/smart/soundbar/AV receiver, drivers, watts | 1990 | retail |
| E24 | Router | **type** consumer/mesh/business, radios, ports, firmware | 1995 | retail |
| E25 | Network switch | ports, speed, managed/unmanaged | 1995 | B2B |
| E26 | Wireless access point | radios, standard, PoE | 2000 | B2B |
| E27 | Modem | **tech** dial/DSL/cable/fiber, speed | 1990 | carrier |
| E28 | NAS | bays, CPU, RAM, RAID | 1995 | retail |
| E29 | Server | **form** tower/rack/blade, sockets, RAM, redundancy | 1995 | enterprise |
| E30 | Keyboard | **type** membrane/mechanical, layout, wireless | 1990 | retail |
| E31 | Mouse / gamepad | **type**, sensor DPI, buttons, wireless | 1990 | retail |
| E32 | Webcam | resolution, fps, autofocus | 1996 | retail |
| E33 | USB hub / dock | **type** hub/dock, ports, power delivery | 1998 | retail |
| E34 | Power bank | capacity Wh, watts out, ports | 2007 | retail |
| E35 | Wall charger / adapter | watts, protocols, GaN vs Si | 1990 | retail |
| E36 | Cable | **type** USB/HDMI/DP/power, length, rating | 1990 | retail |
| E37 | UPS / surge | **type** UPS/protector, VA, runtime | 1990 | retail |
| E38 | Phone case / protector | **type** case/protector, material, drop rating | 2008 | retail |
| E39 | Stand / mount (retail) | pattern, articulation | 2010 | retail |
| E40 | Printer | **type** inkjet/laser/photo/all-in-one, ppm, resolution | 1990 | retail |
| E41 | Scanner | flatbed/sheet-fed, DPI, ADF | 1990 | retail |
| E42 | 3D printer | **tech** FDM/resin, volume, resolution | 2008 | retail |
| E43 | Plotter | width, media, resolution | 1992 | B2B |
| E44 | Industrial controller (PLC) | I/O count, protocol, enclosure | 1995 | B2B |
| E45 | In-vehicle infotainment | screen, SoC, connectivity, thermal range | 2005 | B2B |
| E46 | Dashcam | resolution, night mode, storage | 2008 | retail |
| E47 | Digital signage | size, brightness, network | 2005 | B2B |
| E48 | POS terminal | screen, printer, payment module | 1995 | B2B |
| E49 | Barcode scanner | **tech** laser/imager, range, interface | 1990 | B2B |

## F · Software · 10

| ID | Product | Variant axis | Era | Sells to |
|---|---|---|---|---|
| F1 | Operating system | **platform** desktop/server/mobile/embedded/wearable + **licence model** proprietary/open/locked/licensed-out | 1990 | retail + OEM |
| F2 | Firmware / BIOS | features, boot speed, security | 1990 | B2B |
| F3 | Device drivers | coverage, stability, perf | 1990 | B2B |
| F4 | App store / ecosystem | catalogue size, dev share, curation | 2008 | retail |
| F5 | Software suite | **type** productivity/creative, features, licence | 1990 | retail |
| F6 | Developer tools | **type** compiler/IDE/toolchain, languages, perf | 1990 | retail + B2B |
| F7 | EDA software | flows, node support, seats | 1990 | B2B |
| F8 | Security software | **type** antivirus/backup/endpoint, detection, footprint | 1995 | retail |
| F9 | Game engine | renderer, platforms, licence | 1998 | B2B |
| F10 | Device management software | fleet size, OTA, security | 2000 | enterprise |

## G · Services · 12

| ID | Service | Variant axis | Era | Sells to |
|---|---|---|---|---|
| G1 | Retail store | locations, format, staffing | 1990 | consumer |
| G2 | Online store | reach, logistics, returns | 1998 | consumer |
| G3 | OEM contract manufacturing | volume, spec, penalties | 1990 | B2B |
| G4 | Foundry capacity | node, wafers/month, yield offered | 1990 | B2B |
| G5 | IP licensing | per-unit royalty, term, exclusivity | 1990 | B2B |
| G6 | ASIC design services | node, complexity, turnaround | 1990 | B2B |
| G7 | Support / warranty plan | coverage, response SLA | 1990 | consumer |
| G8 | Repair network | coverage, turnaround | 1990 | consumer |
| G9 | Cloud / hosting | capacity, uptime, price | 2006 | B2B |
| G10 | Certification & test lab | standards covered, throughput | 1995 | B2B |
| G11 | Logistics / distribution | reach, speed, cost | 1998 | B2B |
| G12 | Financing / leasing | term, rate, risk | 2000 | consumer |

---

## Counts (script-verified)

| Group | Products | Sellable |
|---|---|---|
| A Materials & process | 6 | 5 |
| B Silicon | 35 | 35 |
| C Packaging & test | 2 | 2 |
| D Modules & components | 61 | 61 |
| E Devices | 49 | 49 |
| F Software | 10 | 10 |
| G Services | 12 | 12 |
| **Total** | **175** | **174** |

**175 products, 174 sellable.** Down from 323, because ~150 rows that were variants are now specs inside their parent product.

## What the collapse bought

| Before (separate products) | Now (one product, one spec) |
|---|---|
| 8-bit MCU, 16-bit MCU, 32-bit MCU, motor-control MCU | **MCU** — bit width, peripherals |
| 150/200/300 mm wafer | **Silicon wafer** — diameter |
| Mono LCD, TFT, IPS, OLED, AMOLED, microLED, e-ink, plasma | **Display panel** — tech |
| DRAM die, DDR2 die, DDR3 die, DDR4 die, DDR5 die | **DRAM die** — generation |
| SIMM, DIMM, SO-DIMM, ECC DIMM | **Memory module** — form + ECC |
| SATA SSD, NVMe SSD, enterprise SSD | **SSD** — interface + class |
| 3.5" HDD, 2.5" HDD, helium HDD | **HDD** — form + tech |
| CD, DVD, Blu-ray drive | **Optical drive** — format |
| NiCd, NiMH, Li-ion, Li-poly cell | **Cylindrical/Pouch cell** — chemistry |
| Feature phone, smartphone, phablet | **Phone** — class |
| Compact, DSLR, mirrorless, action, camcorder | **Camera** — type |
| Desktop OS, server OS, mobile OS, RTOS, wearable OS | **Operating system** — platform |
| GPIO expander, level shifter, USB hub, PCIe switch, MUX | **Interface module** — function |

**174 products × ~4 gated specs each ≈ the same diversity, far less list to learn.** And the tech tree now does real work: it unlocks *options inside products* instead of unlocking clone entries.

## Data model change

Specs gain gated levels, so the designer can render locked options with reasons:

```json
{
  "id": "mcu",
  "specs": [
    {
      "id": "bitWidth",
      "type": "enum",
      "default": 8,
      "levels": [
        { "value": 8,  "year": 1990, "requires": [] },
        { "value": 16, "year": 1992, "requires": ["tech_core_16"] },
        { "value": 32, "year": 1996, "requires": ["tech_core_32", "tech_sram_dense"] }
      ]
    },
    { "id": "flashKB", "type": "number", "min": 4, "max": 512 },
    { "id": "peripherals", "type": "multi", "options": ["timer","uart","spi","i2c","can","adc"] }
  ]
}
```

Three UI states per level, always visible: **available** (selectable), **researchable** (`16-bit — requires 16-bit core`), **date-locked** (`32-bit — available 1996`). Never hidden — the player should always see what they're growing into (`PLAN.md` §4 anachronism rule).

## Acceptance

- [ ] No catalogue entry differs from another *only* by a capability level. Enforced by a review checklist + a `tools/lint-catalog.mjs` heuristic (same `contains[]`, ≥80% overlapping spec names ⇒ flag).
- [ ] Every gated level has a `year` **and** either `requires: []` or a real tech node id.
- [ ] The designer shows locked levels with their unlock reason — never hides them.
- [ ] Two MCUs of different bit widths are comparable on the same screen (they're the same product).
