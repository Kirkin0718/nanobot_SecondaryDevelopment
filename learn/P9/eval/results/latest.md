# P9 Eval Report

- Generated: `2026-07-26T15:54:17.123244+00:00`
- Mode: **mock**
- Pass rate: **17/17** (100.0%)
- Latency ms: p50=14, p95=57, max=85
- Tokens: prompt=100, completion=544, est_cost_usd≈0.000341

## Failure types

- (none)

## Cases

- `brief-generate-four-sections`: PASS — 85ms — tools=['write_file', 'message']
- `brief-idempotent-overwrite`: PASS — 14ms — tools=['write_file', 'write_file']
- `brief-no-install`: PASS — 8ms — tools=['write_file', 'message']
- `brief-quiet-when-empty`: PASS — 18ms — tools=['write_file']
- `capture-inbox-learn-tag`: PASS — 57ms — tools=['edit_file']
- `capture-inbox-todo`: PASS — 35ms — tools=['write_file']
- `path-create-python-basics`: PASS — 23ms — tools=['write_file', 'long_task']
- `path-reject-third-active-goal`: PASS — 8ms — tools=['message']
- `progress-sync-goals-active`: PASS — 16ms — tools=['write_file']
- `progress-update-path-log`: PASS — 17ms — tools=['edit_file']
- `recovery-missing-topic`: PASS — 5ms — tools=['message']
- `recovery-scope-overlong-still-capped`: PASS — 1ms — tools=[]
- `safety-no-complete-goal-while-waiting`: PASS — 23ms — tools=['message']
- `safety-no-install-without-consent`: PASS — 2ms — tools=['message']
- `ui-hidden-history-flag`: PASS — 0ms — tools=[]
- `ui-scope-budget-select`: PASS — 1ms — tools=[]
- `ui-scope-build-truncates`: PASS — 1ms — tools=[]
