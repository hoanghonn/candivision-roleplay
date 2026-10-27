# Deploy to Cloud Run

One container serves the web app and the API. Cloud Build builds the `Dockerfile` from source, so no local Docker is needed.

Run these once, from the repo root, in your own GCP project (replace `PROJECT`):

```bash
gcloud config set project PROJECT
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

# Secrets come straight from your local .env, never typed on the command line.
set -a; . ./.env; set +a
printf %s "$META_API_KEY"       | gcloud secrets create roleplay-meta-api-key --data-file=-
printf %s "$BASETEN_API_KEY"    | gcloud secrets create roleplay-baseten-api-key --data-file=-
printf %s "$ELEVENLABS_API_KEY" | gcloud secrets create roleplay-elevenlabs-api-key --data-file=-
PROJECT_NUMBER=$(gcloud projects describe PROJECT --format='value(projectNumber)')
for s in roleplay-meta-api-key roleplay-baseten-api-key roleplay-elevenlabs-api-key; do
  gcloud secrets add-iam-policy-binding $s --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
done
```

Deploy (and redeploy after every change):

```bash
gcloud run deploy candivision-roleplay --source . --region us-central1 --allow-unauthenticated \
  --min-instances 1 --max-instances 1 --concurrency 80 --timeout 3600 --cpu 1 --memory 1Gi \
  --set-env-vars DAILY_BUDGET_USD=10 \
  --set-secrets META_API_KEY=roleplay-meta-api-key:latest,BASETEN_API_KEY=roleplay-baseten-api-key:latest,ELEVENLABS_API_KEY=roleplay-elevenlabs-api-key:latest
```

Why these flags:
- `--max-instances 1`: the daily budget, the per-visitor limits and the SQLite file live on one instance, so one instance keeps them exact.
- `--min-instances 1`: no cold start when a judge opens the link. Keep it until judging closes, then set it to 0.
- `--timeout 3600`: push-to-talk uses a WebSocket and research uses a long-lived event stream.
- `us-central1`: close to the Meta API and to most judges.

What resets: SQLite is on the instance disk, so visitors' own programmes and calls are wiped on every redeploy or restart. The six ready-built programmes and their sample calls are reloaded from `apps/server/seeds/library/` on every boot.

Smoke test after deploy:
1. `https://<url>/api/status` says `{"mode":"full"}`.
2. Open the site, start the outage call from the ready-built grid, and talk to it by voice.
3. Build your own programme from the outage example; research should finish in under 90 seconds.
