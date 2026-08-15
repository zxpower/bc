# Simple Web Ballistic Calculator

Ballistic calculator to match Schmidt & Bender PMII-2 scope turrets.
Enter your **distance**, **bullet drop** (elevation) and **wind drift** (windage),
each in MOA or MRAD, and it tells you how many turret **clicks** to dial — plus
the breakdown into numbered marks and the dial direction (UP / LEFT / RIGHT).

## How it works

The drop (angular) is converted to a linear offset at the target distance, then
divided by the turret's click value at that distance:

- 1 MOA subtends `2.908882 cm` per 100 m
- 1 MRAD subtends `10 cm` per 100 m
- Turret click default: `0.25 cm per 100 m` (configurable in *Turret settings*)

**Example:** 4.6 MOA at 300 m
- Drop = `4.6 × 2.908882 × 3 = 40.14 cm`
- 1 click = `0.25 × 3 = 0.75 cm` at 300 m
- Clicks = `40.14 / 0.75 ≈ 54` → `13 marks + 2 clicks`

Both the click value and clicks-per-mark are adjustable for other scopes/turrets.

## Full trajectory calculator

A second section computes the whole trajectory from first principles instead of a
single known drop. It's a 3-DOF point-mass solver using the standard **G1/G7**
drag models:

- **Bullet:** caliber, weight (grains), length (mm), muzzle velocity (m/s),
  ballistic coefficient (G1 or G7)
- **Rifle/scope:** zero distance, sight height over bore, barrel twist &
  twist direction (drives gyroscopic stability + spin drift)
- **Atmosphere:** temperature, pressure, humidity (used for real air density)
- **Wind:** speed + direction as a clock hour (12 = headwind, 3 = from the right)
- **Range:** from / to / step

It auto-solves the launch angle for your zero, then prints a table with velocity,
energy, time of flight, drop and wind drift (cm + your chosen **MRAD or MOA**)
plus the required elevation and windage **clicks** (using the turret settings above).

From twist rate and bullet length it also computes the **Miller gyroscopic
stability factor (Sg)** — with a warning if the bullet is marginal (< 1.4) or
unstable (< 1.0) — and folds **spin drift** (Litz approximation, right/left twist
aware) into the wind/drift column.

### G1 / G7 ballistic coefficient

Enter the BC in whichever model your bullet is published in. Switching the
**G1 / G7** toggle converts the value in place — the same way the MOA/MRAD/cm
toggles work in the turret card — so you keep describing one bullet and the whole
app (trajectory table + target card) recalculates against the matching drag curve.
The line under the field always shows the equivalent in the other model.

The two BCs are related by equal retardation, `Cd_G1(M)/BC_G1 = Cd_G7(M)/BC_G7`,
so the conversion factor is just `Cd_G1(M) / Cd_G7(M)` read off the drag tables at
your bullet's own Mach number. That factor is clamped to Mach 1.5–3.0, where it
lands between 1.91 and 1.99 — matching the ~1.95 measured for modern boat-tails
(175 gr SMK: 0.475 G1 / 0.243 G7). Outside that band, and especially through the
transonic region, the ratio swings from 1.3 to 2.3 and is not meaningful.

> A converted BC is an approximation of a *measured* one. If your bullet has a
> published BC in the model you want to shoot, type that instead.

> Note: this is a helper/estimator. Verify against real dope before relying on it.

## Target card

A third section builds a **dial-up card for a set of known targets** instead of an
even range ladder. Add a row per target (minimum one), type its distance, and get
the correction for each — rows are lettered **A, B, C, …** so they match how you
range and call them.

It reuses the load, atmosphere, wind and turret settings from the sections above,
so the numbers agree with the trajectory table. For every target it shows drop
(cm + MRAD/MOA), elevation clicks to dial UP, drift with the side it pushes to,
windage clicks with the direction to dial, time of flight and remaining velocity.
Targets are kept in the order you entered them, and any distance the bullet can't
reach is reported as *no solution* rather than silently estimated.

## Tests

`test.js` extracts the app's `<script>` from `index.html` and runs 46 assertions
against the pure functions (unit conversion, turret math, atmosphere, drag
interpolation, Miller stability, spin drift, trajectory-solver behaviour, G1↔G7
BC conversion, and the target-card row labels/solver):

```bash
node test.js
```

CI runs these in a `test` job that gates the image build.

## Run (Docker)

With Docker Compose:

```bash
docker compose up --build
```

Or with plain Docker:

```bash
docker build -t ballistic-calculator .
docker run -p 8080:80 ballistic-calculator
```

Then open http://localhost:8080

## License

MIT © [Reinholds Zviedris](https://estivador.io)

Source: https://github.com/zxpower/bc

> Disclaimer: provided as-is for informational/educational use, with no warranty.
> Ballistic outputs are estimates — always confirm against verified dope.
