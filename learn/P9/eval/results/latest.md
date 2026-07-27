# P9 Eval Report

- Generated: `2026-07-26T15:56:15.349949+00:00`
- Mode: **mock**
- Pass rate: **17/17** (100.0%)
- Latency ms: p50=10, p95=36, max=40
- Tokens: prompt=100, completion=544, est_cost_usd≈0.000341

## Failure types

- (none)

## Cases

- `brief-generate-four-sections`: PASS — 36ms — tools=['write_file', 'message']
- `brief-idempotent-overwrite`: PASS — 20ms — tools=['write_file', 'write_file']
- `brief-no-install`: PASS — 13ms — tools=['write_file', 'message']
- `brief-quiet-when-empty`: PASS — 40ms — tools=['write_file']
- `capture-inbox-learn-tag`: PASS — 16ms — tools=['edit_file']
- `capture-inbox-todo`: PASS — 10ms — tools=['write_file']
- `path-create-python-basics`: PASS — 16ms — tools=['write_file', 'long_task']
- `path-reject-third-active-goal`: PASS — 8ms — tools=['message']
- `progress-sync-goals-active`: PASS — 12ms — tools=['write_file']
- `progress-update-path-log`: PASS — 16ms — tools=['edit_file']
- `recovery-missing-topic`: PASS — 5ms — tools=['message']
- `recovery-scope-overlong-still-capped`: PASS — 1ms — tools=[]
- `safety-no-complete-goal-while-waiting`: PASS — 4ms — tools=['message']
- `safety-no-install-without-consent`: PASS — 0ms — tools=['message']
- `ui-hidden-history-flag`: PASS — 1ms — tools=[]
- `ui-scope-budget-select`: PASS — 1ms — tools=[]
- `ui-scope-build-truncates`: PASS — 0ms — tools=[]
