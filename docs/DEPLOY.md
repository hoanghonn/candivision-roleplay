# Deploy to Cloud Run

One container serves the web app and the API. Cloud Build builds the `Dockerfile` from source, so no local Docker is needed. `.gcloudignore` keeps `.env` and the research folders out of the upload.

The live site is `https://platform.candivision.co`, in the `code-beavers-dev` project, which also runs production Candivision. It therefore gets its own service account that can read its three secrets and nothing else. Do not run it as the default compute account, which has `roles/editor` on the project.

## First time

```bash
PROJECT=code-beavers-dev
SA=candivision-roleplay@$PROJECT.iam.gserviceaccount.com
gcloud config set project $PROJECT
gcloud iam service-accounts create candivision-roleplay --display-name "CandiVision Roleplay (public site)"

# Secrets come straight from your local .env, never typed on the command line.
set -a; . ./.env; set +a
printf %s "$META_API_KEY"       | gcloud secrets create roleplay-meta-api-key --data-file=-
printf %s "$BASETEN_API_KEY"    | gcloud secrets create roleplay-baseten-api-key --data-file=-
printf %s "$ELEVENLABS_API_KEY" | gcloud secrets create roleplay-elevenlabs-api-key --data-file=-
for s in roleplay-meta-api-key roleplay-baseten-api-key roleplay-elevenlabs-api-key; do
  gcloud secrets add-iam-policy-binding $s --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
done
```

## Deploy (and redeploy after every change)

```bash
gcloud run deploy candivision-roleplay --source . --region asia-east1 --allow-unauthenticated \
  --service-account $SA \
  --min-instances 0 --max-instances 1 --concurrency 80 --timeout 3600 --cpu 1 --memory 512Mi \
  --set-env-vars DAILY_BUDGET_USD=10 \
  --set-secrets META_API_KEY=roleplay-meta-api-key:latest,BASETEN_API_KEY=roleplay-baseten-api-key:latest,ELEVENLABS_API_KEY=roleplay-elevenlabs-api-key:latest
```

Why these flags:
- `--service-account`: a bug in this public, no-login app must not reach production.
- `--max-instances 1`: the daily budget, the per-visitor limits and the SQLite file live on one instance, so one instance keeps them exact.
- `--min-instances 0`: no always-on cost. The first visitor after a shutdown waits for a cold start, about 3 seconds in a local test. Each shutdown also wipes visitors' own work and resets the daily budget and limits.
- `--cpu 1 --memory 512Mi`: the cheapest size that fits. The server uses about 160 MiB when idle, and Cloud Run needs a full vCPU to serve more than one request at a time. Idle instances cost nothing, and active use costs about $0.09 an hour.
- `--timeout 3600`: push-to-talk uses a WebSocket and research uses a long-lived event stream.
- `asia-east1`: the same list price as `us-central1`, closer to learners in Vietnam, and where production Candivision and its domain mappings already run. A model reply takes seconds, so the extra network time for visitors in the US should barely show.

## Domain

```bash
gcloud beta run domain-mappings create --service candivision-roleplay --domain platform.candivision.co --region asia-east1
```

Then add the record it prints at GoDaddy, normally a CNAME from `platform` to `ghs.googlehosted.com`. The certificate can take 15 minutes to 24 hours.

## Spend guards

- **In the app:** per visitor (3 new programmes, 10 edits, 10 calls, 20 spoken requests a day) and, more generously, per client address (8, 30, 30, 60). At 80% of `DAILY_BUDGET_USD` only calls on ready-built programmes stay open, and at 100% the site is read-only until midnight UTC.
- **At the vendors:** set hard limits at Meta and ElevenLabs, and at Baseten if it offers one. The in-app figure is an estimate and resets to zero on every shutdown or restart, so only a vendor limit is a true ceiling.
- **Alert:** an uptime check on `/api/status` every 5 minutes that looks for `"mode":"full"`, so a used-up budget raises an alert. It also tends to keep an idle instance alive, which makes cold starts and data loss rarer, but Cloud Run can still stop the instance at any time.

If the budget is used up during judging, updating any setting restarts the service and clears the counter:

```bash
gcloud run services update candivision-roleplay --region asia-east1 --update-env-vars DAILY_BUDGET_USD=10
```

`DAILY_BUDGET_USD=0` turns the site read-only straight away. Either way the restart wipes visitors' own work.

## After judging

Lock it the same day. This blocks all public access, including the `.run.app` address:

```bash
gcloud run services update candivision-roleplay --region asia-east1 --no-allow-unauthenticated
```

It should only reopen once it has login, a database that survives restarts and a privacy notice covering Meta and Baseten.

## What resets

SQLite is on the instance disk, so visitors' own programmes and calls are wiped on every redeploy, restart or scale-down to zero. The nineteen ready-built programmes and their sample calls are reloaded from `apps/server/seeds/library/` on every boot.

## Smoke test after deploy

1. `https://platform.candivision.co/api/status` says `{"mode":"full"}`.
2. Open the site, start the outage call from the ready-built grid, and talk to it by voice.
3. Build your own programme from the outage example; research should finish in under 90 seconds.
4. Open the site from two different networks (for example laptop wifi and a phone on mobile data) and check both can start calls. If everyone seems to share one limit, the client address is not being read correctly (`clientIp` in `apps/server/src/app.ts`), and the per-address caps in `apps/server/src/main.ts` should be removed.
5. With the ElevenLabs key disabled, or its limit reached, a call should continue in the browser's own voice.
