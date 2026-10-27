# CandiVision Roleplay

**Voice role-play training built on research, not guesswork.**

A training lead describes a conversation their people get wrong ("our engineers make outage calls worse", "our call-centre staff read the refund policy like robots"), attaches their own material, and CandiVision Roleplay:

1. **Researches first.** It searches open scholarly databases (OpenAlex, Crossref) and our own library of proven methods for how experts handle the situation and how people learn it. Sources appear on screen as they are checked.
2. **Builds a programme where every line names its source.** Skills, 2 or 3 levels that get harder in steps, an AI character with hidden facts the learner has to earn, and a rubric of must-have and nice-to-have lines.
3. **Runs a voice role-play.** The learner holds a button and talks; the character answers by voice, and its mood moves with what the learner actually does.
4. **Debriefs with evidence.** Two independent AI judges score each rubric line with a quote from the call; the debrief shows the moment, the rubric line, the source behind it, one thing to try, and a 60-second drill on the weakest must-have.
5. **Reports team progress** on a fixed version of the programme: first try against latest, by skill. No leaderboards.

For training only. Results are never meant for hiring, firing or performance ratings, and a request to screen or rank people is declined.

## How "no guessing" is enforced

| Rule | Where |
|---|---|
| A source the research tools did not return is dropped, even if the model cites it. | `apps/server/src/research.ts` |
| Every paper DOI must resolve in the DOI handle system, and papers must be cited at least 10 times. | `apps/server/src/papers.ts` |
| Every skill, level and rubric line must cite a source from the brief or quote the customer's own file word for word; otherwise the programme is regenerated once, then turned into questions for the training lead. | `packages/core/src/validate.ts`, `apps/server/src/builder.ts` |
| What research could not answer is listed as "not found" instead of being filled in. | research brief |
| Each rubric line is judged by two different models. A pass must quote the learner's own words from the call. If the judges disagree the line is "unsure" and the training lead settles it; nothing is averaged away. | `packages/core/src/gate.ts`, `apps/server/src/judges.ts` |
| The same transcript always gets the same result (temperature 0, stored verdicts per version and transcript). | `apps/server/src/judges.ts` |
| The character's mood can move at most 20 points a turn and never below the level's floor; facts are only revealed once and only from its card. A pre-publish test call checks it stays in role against a weak learner. | `apps/server/src/persona.ts`, `apps/server/src/testcall.ts` |

## The method library

Our own short summaries, in our own words, with links checked by `scripts/check-library.ts`:

- Service recovery: Smith, Bolton and Wagner (1999); Tax, Brown and Chandrashekaran (1998); de Matos, Henrique and Rossi (2007)
- Apologies: Lewicki, Polin and Lount (2016)
- Incident communication: PagerDuty Incident Response documentation
- Sales: SPIN Selling (Rackham, 1988); implementation intentions (Gollwitzer and Sheeran, 2006)
- Feedback conversations: Situation-Behavior-Impact (Center for Creative Leadership); Crucial Conversations (Patterson et al., 2002); feedback interventions (Kluger and DeNisi, 1996); active listening (Weger et al., 2014)
- Regulated messaging: IFPMA Code of Practice (2019)
- How people learn: deliberate practice (Ericsson, Krampe and Tesch-Römer, 1993); the power of feedback (Hattie and Timperley, 2007); debriefing with good judgment (Rudolph et al., 2006); self-explanation (Bisra et al., 2018); behaviour modelling training (Taylor, Russ-Eft and Chan, 2005); simulation games (Sitzmann, 2011); spaced practice (Cepeda et al., 2006); transfer of training (Blume et al., 2010); the Kirkpatrick model

Branded models such as SBI are used as ideas with credit; none of their materials are reproduced.

## Six ready-built programmes

Made by the same pipeline (`scripts/build-library.ts`) from realistic requests and clearly fictional customer material: an outage call to an angry client, sales onboarding, a Vietnamese call-centre refund complaint, partner certification, a manager's hard conversation, and regulated medical messaging.

## Models

- **Meta Muse Spark** (`muse-spark-1.3`): case match, research agent, programme builder, plain-words edits, the AI character, judge 1.
- **Meta Muse Spark Open on Baseten** (`meta-models/muse-spark-open-1026`): judge 2.
- **Meta Muse Voice Transcribe**: push-to-talk speech recognition in English, Vietnamese and Japanese.
- **Meta Muse Image**: character portraits.
- **ElevenLabs** (`eleven_flash_v2_5`): the character's voice.

## Run it locally

Needs Node 22.

```bash
cp .env.example .env   # add META_API_KEY, BASETEN_API_KEY, ELEVENLABS_API_KEY
npm install
npm run dev:server     # http://localhost:8787
npm run dev:web        # http://localhost:5173
npm test               # all workspaces
```

Deploying: see [docs/DEPLOY.md](docs/DEPLOY.md). Measured latencies and costs: [docs/FACTS.md](docs/FACTS.md).

## Layout

- `packages/core`: shared types and all pure logic (schemas, case templates, method library, validator, judge combining, the gate, debrief, team report).
- `apps/server`: Fastify + SQLite. The model pipeline, voice bridge, per-visitor workspaces and daily budget.
- `apps/web`: React. Request, live research, programme, call, debrief and team report screens.

## Licence

MIT. See [LICENSE](LICENSE).
