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

## Run (Docker)

```bash
docker compose up --build
```

Then open http://localhost:8080

Or with plain Docker:

```bash
docker build -t ballistic-calculator .
docker run -p 8080:80 ballistic-calculator
```
