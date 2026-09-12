# Entropy — illustrative demo practice

Resource ID: `demo_entropy_v1`

This is original, unreviewed practice material created for the StudyGPS prototype. It is not official course material or an instructor-approved assessment. All values are illustrative. The configured importance and study duration are manually chosen demo parameters, not official exam weights or validated learning times. Completing these exercises does not guarantee a score.

Use the blocks in order. A 30-minute allocation covers Block 1 only; 60 minutes covers Blocks 1–2. Both are partial practice. A 90-minute allocation covers all three. The times are suggested demo blocks, not measured completion times.

## Block 1 — entropy-change units (30 minutes)

For the specified reversible, constant-temperature heat-transfer examples, use:

```text
entropy change = reversible heat added / absolute temperature
ΔS = Q_rev / T
```

Use J for heat, K for temperature, and J/K for entropy change. Heat added is positive. This form applies to the stated constant-temperature reversible examples; do not apply it to every process without checking those conditions.

1. Calculate entropy change when 600 J is reversibly added at 300 K.
2. Calculate entropy change when 900 J is reversibly removed at 300 K.
3. Compare 600 J reversibly added at 300 K with the same heat added at 600 K.

## Block 2 — system and surroundings (30 minutes)

For these supplied changes, calculate:

```text
total entropy change = system entropy change + surroundings entropy change
```

Treat the combined system and surroundings as isolated. Its total entropy cannot decrease in a physically admissible process. A nonnegative result is a necessary check, not proof of a complete process model.

1. The system changes by `+4 J/K` and the surroundings by `−3 J/K`. Find the total and check its sign.
2. The system changes by `+2 J/K` and the surroundings by `−2 J/K`. Find the total.
3. A proposed process has changes of `−5 J/K` and `+3 J/K`. Find the total and explain the issue under the stated isolated-combination assumption.

## Block 3 — find the mistakes (30 minutes)

1. A worked line says `600 J / 300 K = 2 J`. Correct the unit.
2. Another line uses `Q_rev = +900 J` for heat removed. Correct the sign and recalculate at 300 K.
3. Rewrite the conditions required before using `ΔS = Q_rev / T` in these exercises.
4. Explain why a negative **system** entropy change alone does not establish a negative **total** entropy change.

## Worked checks

- Block 1.1: `600 / 300 = 2 J/K`.
- Block 1.2: `−900 / 300 = −3 J/K`.
- Block 1.3: At 600 K, `600 / 600 = 1 J/K`, compared with `2 J/K` at 300 K.
- Block 2.1: `4 + (−3) = 1 J/K`, positive.
- Block 2.2: `2 + (−2) = 0 J/K`.
- Block 2.3: `−5 + 3 = −2 J/K`; the negative total fails the stated isolated-combination check.
- Block 3.1: The unit is `J/K`.
- Block 3.2: Heat removed has `Q_rev = −900 J`, giving `−3 J/K`.
- Block 3.3: The heat transfer is reversible and the temperature is constant and expressed in kelvin.
- Block 3.4: The surroundings also contribute; both changes must be included in the total.
