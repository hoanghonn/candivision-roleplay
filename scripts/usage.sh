#!/usr/bin/env bash
# Usage and failures on the live site, from the server's own events (see apps/server/src/events.ts).
# Cloud Logging keeps them 30 days. Usage: scripts/usage.sh [days]   (default 7)
set -euo pipefail
DAYS=${1:-7}
OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="candivision-roleplay" AND jsonPayload.event:*' \
  --project code-beavers-dev --freshness="${DAYS}d" --limit=100000 --format=json > "$OUT"
python3 -I - "$OUT" <<'PY'
import json, sys, collections as C
events = [e["jsonPayload"] | {"day": e["timestamp"][:10]} for e in json.load(open(sys.argv[1]))]
if not events:
    sys.exit("No events yet. They start with the deploy that added apps/server/src/events.ts.")
days = sorted({e["day"] for e in events})
of = lambda name, day=None: [e for e in events if e["event"] == name and (day is None or e["day"] == day)]

print("Per day (Hanoi dates are UTC dates here)")
fmt = "{:<12}{:>9}{:>7}{:>8}{:>8}{:>8}{:>8}{:>9}"
print(fmt.format("day", "callers", "calls", "scored", "passed", "builds", "limits", "failures"))
for d in days:
    fails = sum(len(of(n, d)) for n in ("tts_failed", "stt_failed", "persona_failed", "portrait_failed", "server_error"))
    print(fmt.format(d, len({e["visitor"] for e in of("call_started", d)}), len(of("call_started", d)), len(of("call_scored", d)),
                     sum(e.get("result") == "passed" for e in of("call_scored", d)), len(of("build_requested", d)), len(of("limit_hit", d)), fails))

print("\nCalls by programme")
for (title, lang), n in C.Counter((e.get("programme") or "(own programme)", e.get("language")) for e in of("call_started")).most_common():
    print(f"  {n:4}  [{lang}] {title}")

scored = of("call_scored")
if scored:
    turns = sorted(e["learnerTurns"] for e in scored)
    print(f"\nScored calls: {len(scored)}, learner turns median {turns[len(turns)//2]}, with no turns {sum(t == 0 for t in turns)}")
    print("  results:", dict(C.Counter(e["result"] for e in scored)), " judges incomplete:", sum(not e["complete"] for e in scored))

print("\nFailures and blocks")
for name in ("tts_failed", "stt_failed", "persona_failed", "portrait_failed", "server_error", "limit_hit", "budget_blocked", "build_finished"):
    rows = of(name)
    if not rows: continue
    key = {"tts_failed": "reason", "limit_hit": "kind", "budget_blocked": "code", "build_finished": "outcome", "server_error": "route"}.get(name)
    detail = dict(C.Counter(str(e.get(key)) for e in rows)) if key else ""
    print(f"  {name:16} {len(rows):4}  {detail}")
    last = rows[0]
    if name.endswith(("failed", "error")) and name != "build_finished":
        print(f"  {'':16} latest: {last.get('detail') or last.get('error') or ''}"[:160])
PY
