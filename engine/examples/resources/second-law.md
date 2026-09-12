# Second Law — illustrative demo practice

Resource ID: `demo_second_law_v1`

This is original, unreviewed practice material created for the StudyGPS prototype. It is not official course material or an instructor-approved assessment. All values are illustrative. The configured importance and study duration are manually chosen demo parameters, not official exam weights or validated learning times. Completing these exercises does not guarantee a score.

Use the blocks in order. A 30-minute allocation covers Block 1 only and is partial practice; a 60-minute allocation covers both blocks. The times are suggested demo blocks, not measured completion times.

## Block 1 — the ideal limit (30 minutes)

Consider a heat engine operating between two constant-temperature reservoirs. For this elementary model, the reversible efficiency limit is:

```text
efficiency limit = 1 − T_cold / T_hot
```

Use absolute temperatures in kelvin (K), with `T_hot > T_cold > 0`. This limit is a bound for this model, not the predicted efficiency of an actual engine.

1. Calculate the efficiency limit for `T_hot = 600 K` and `T_cold = 300 K`.
2. For those same reservoirs, check proposed efficiencies of 40% and 60%. Which exceeds the limit?
3. Explain why being below the limit does not prove that a proposed engine design works.

## Block 2 — work and rejected heat (30 minutes)

For an engine operating in a cycle, use these positive magnitudes:

```text
net work output = heat input − heat rejected
efficiency = net work output / heat input
```

1. With heat input of 1,000 J and net work output of 400 J, calculate heat rejected and efficiency. Compare that efficiency with the 600 K / 300 K limit.
2. Keep `T_cold = 300 K`, but change `T_hot` to 750 K. Recalculate the ideal limit.
3. A proposed engine between 600 K and 300 K receives 1,000 J and delivers 700 J of net work. Its energy balance gives 300 J of rejected heat. Explain why this energy balance alone does not make the proposal consistent with the efficiency limit.

## Worked checks

- Block 1.1: `1 − 300 / 600 = 0.5 = 50%`.
- Block 1.2: 60% exceeds the limit; 40% does not exceed it.
- Block 1.3: Passing one necessary bound does not establish a feasible device design or its actual performance.
- Block 2.1: Heat rejected is `1,000 − 400 = 600 J`; efficiency is `400 / 1,000 = 40%`, below the 50% limit.
- Block 2.2: `1 − 300 / 750 = 0.6 = 60%`.
- Block 2.3: `700 / 1,000 = 70%`, which exceeds the 50% bound for these reservoirs even though the energy quantities balance.
