# Rankine Cycle — illustrative demo practice

Resource ID: `demo_rankine_cycle_v1`

This is original, unreviewed practice material created for the StudyGPS prototype. It is not official course material or an instructor-approved assessment. The enthalpy values are synthetic arithmetic inputs, not measured steam properties or steam-table data. The configured importance and study duration are manually chosen demo parameters, not official exam weights or validated learning times. Completing these exercises does not guarantee a score.

Use the blocks in order. A 30-minute allocation covers Block 1 only and is partial practice; a 60-minute allocation covers both blocks. The times are suggested demo blocks, not measured completion times.

## Block 1 — label the cycle and work terms (30 minutes)

Use this simple device sequence and state numbering:

```text
1 → pump → 2 → boiler → 3 → turbine → 4 → condenser → 1
```

For the arithmetic exercises, assume steady operation, negligible kinetic and potential energy changes, no heat transfer in the pump or turbine, and no shaft work in the boiler or condenser. All enthalpies and specific work/heat quantities are in kJ/kg.

| State | Supplied enthalpy |
| --- | ---: |
| 1 | 200 |
| 2 | 220 |
| 3 | 2,220 |
| 4 | 1,420 |

Use positive magnitudes:

```text
pump work input = h2 − h1
turbine work output = h3 − h4
net work output = turbine work output − pump work input
```

1. Sketch the sequence and label each device.
2. Calculate pump work input and turbine work output.
3. Calculate net work output. Explain why pump input is subtracted.

## Block 2 — heat and efficiency checks (30 minutes)

Use:

```text
heat input = h3 − h2
heat rejected = h4 − h1
thermal efficiency = net work output / heat input
```

1. Calculate heat input and heat rejected from the supplied values.
2. Calculate thermal efficiency as a fraction and a percentage.
3. Check that `heat input − heat rejected = net work output`.
4. A learner divides turbine work output by heat input and reports 40%. Explain the missing term and give the corrected efficiency.

## Worked checks

- Block 1.2: Pump input is `220 − 200 = 20 kJ/kg`; turbine output is `2,220 − 1,420 = 800 kJ/kg`.
- Block 1.3: Net output is `800 − 20 = 780 kJ/kg`; the pump consumes some of the turbine's output.
- Block 2.1: Heat input is `2,220 − 220 = 2,000 kJ/kg`; heat rejected is `1,420 − 200 = 1,220 kJ/kg`.
- Block 2.2: `780 / 2,000 = 0.39 = 39%`.
- Block 2.3: `2,000 − 1,220 = 780 kJ/kg`, matching net output.
- Block 2.4: `800 / 2,000 = 40%` omits the 20 kJ/kg pump input. The cycle efficiency uses net output and is 39% for these synthetic values. This arithmetic does not establish a realizable steam state set or predict an actual plant's efficiency.
