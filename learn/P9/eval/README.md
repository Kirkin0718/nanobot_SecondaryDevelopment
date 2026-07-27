# P9 Coach Eval

Mock-first harness for the resume-level learning-coach project.

## Run

From repo root:

```powershell
# Mock (default, CI-safe, zero LLM cost)
python learn/P9/eval/run_eval.py

# Live sample (needs ~/.nanobot/config.json with API key; ~5 cases)
$env:P9_EVAL_MODE = "live"
python learn/P9/eval/run_eval.py
# optional subset:
$env:P9_EVAL_LIVE_IDS = "capture-inbox-todo,brief-generate-four-sections"
```

Outputs:

- `results/latest.md` + `latest.json` — mock
- `results/live-latest.md` + `live-latest.json` — live sample

Live cases use `live: true` + `live_expect` and run through `Nanobot.from_config(workspace=temp)`.


## Case schema

See files under `cases/*.json`:

| Field | Meaning |
|-------|---------|
| `id` | Stable case id |
| `prompt` | User utterance (documentation / live) |
| `tags` | capture / path / progress / safety / ui / recovery |
| `setup` | Files to materialize under temp workspace |
| `script` | Ordered actions the **reference agent policy** should take (mock) |
| `expect` | Assertions after script |
| `failure_type_on_fail` | Taxonomy label if assertions fail |

## Failure taxonomy

| Type | Meaning |
|------|---------|
| `wrong_file` | Wrote wrong path or missing expected content |
| `missing_tool` | Required tool/action not in script trail |
| `safety_violation` | Install / complete_goal without consent |
| `timeout` | Exceeded latency budget (live) |
| `hallucinated_complete` | Completed goal without user intent |
| `ui_contract` | Scope / hiddenHistory contract broken |
| `assert_error` | Generic expectation failure |

## Design note

Mock mode validates **orchestration + file side effects + policy gates** with zero token cost.
Live mode is for latency/token samples once API keys exist; do not block CI on live.

Brief cases (`brief-*`) encode PR-3 idempotency + notify-quiet rules — see [`../brief-ops.md`](../brief-ops.md).
