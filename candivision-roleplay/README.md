# CandiVision Roleplay UI

The front end for this repo's role-play product, styled with the Candivision design system. It talks to the agents through `apps/server`. It began as a study of another product's UI. The screens have since been redrawn around this product's own needs, and the navigation labels and route names have been replaced.

## Run it

You need the agent server and this app, in two terminals. The keys go in the repo root's `.env` (see `.env.example`).

```sh
# from the repo root
npm install
npm run dev:server    # http://localhost:8787
npm run dev:web       # http://localhost:5199
```

If the server isn't running, the app shows a banner saying so.

## What's connected

Everything on screen is live. Building, calling and scoring are paid model calls, capped by `DAILY_BUDGET_USD` and the server's per-visitor daily limits (3 programmes, 10 edits, 10 calls).

| Screen | Route | Agents and data |
| --- | --- | --- |
| Create | `/create` | Starts a request, with optional files and voice dictation |
| Live research | `/create/jobs/:id` | Case match, research agent and programme builder, streamed |
| Programme | `/programmes/:id` | Evidence, plain-words edits, test call, publish |
| Call | `/call` | AI character, mood, push-to-talk or typing, voice and portrait |
| Debrief | `/debrief/:id` | Two independent judges, settling disagreements, the next drill |
| My Calls | `/calls` | `GET /api/calls`, your own calls and their results |
| Team report | `/team` | First try against latest, by skill and by person |
| Start, Programmes, Browse, Characters | | Ready-built programmes and your own |

There is no login. A random id in the browser is the private workspace.

## How it's wired

- `vite.config.ts` proxies `/api` and `/ws` to `localhost:8787`.
- In production the server hands out `dist/` from this folder, so one container serves the app and the API.
- `src/api.ts` is the API client, and `src/voice/` holds push-to-talk and the voice player. `@roleplay/core` is used for types only.
- `public/pcm-worklet.js` lives in `public/` because browsers load it by URL.
- `src/live.ts` holds the data hooks that fill the cards.

## Languages

The interface is in English and Vietnamese. It starts in the browser's language, and the switch in the sidebar or on Account saves the choice. Strings live in `src/locales/`, and mistyped keys fail the typecheck.

- **Interface language follows the person:** buttons, labels and verdicts.
- **Programme language follows the programme:** the character, rubric and evidence stay in the language they were built in, marked with a `lang` attribute. So does text the model writes about a programme, such as test-call notes and edit summaries.
- **Server errors are codes:** the server sends a stable `code` beside its English `message`, and this app shows its own words for that code.

`npm test` checks that both languages have the same strings and values. The Vietnamese follows the term table and writing rules in `reports/Vietnamese wording for AI roleplay.md`, so read that before changing it. Some choices depart from the market on purpose: "Cần luyện thêm" and "Chưa đạt" rather than "Không đạt", and "Hai AI chấm" rather than "giám khảo". It has not had a native-speaker review yet. Japanese programmes build and run, but the interface around them is English or Vietnamese, there is no bundled Japanese font, and long Japanese titles can break mid-word.

## Design system

`src/design-system.css` holds the Candivision tokens as plain CSS, so this app doesn't need Tailwind. They come from `frontend/css/cvdep-design-system.css` in `cvdep-v2`, at commit `6094210c`. Update them there first, then copy the change here.

The end of `:root` adds a few tokens derived for this app: ink (the dark blue surface), depth and the mood scale. Every colour comes from the palette above them. The faces are the real app's: Be Vietnam Pro for headings, Chakra Petch for eyebrows and Inter for the rest, all from Fontsource, and all three cover Vietnamese.

`src/styles.css` only sets the load order. The rules live in `src/styles/`: `base.css` for the frame and shared pieces, then one sheet per group of screens. The logo and favicon in `public/` are copies from `cvdep-v2`. The theme is light only, because this app has no theme switch, though the call, the verdict and live research sit on ink on purpose: the real app's in-call screen is dark too.

### Images

`public/art/` holds static illustrations made once with Meta Muse Image (`muse-image-1.0`), resized and committed as plain WebP files. Nothing is generated when a page loads, and the app makes no API calls for them.

- `public/art/people/` has portraits of the nineteen ready-built characters, drawn from each persona's `portraitPrompt` (the eight newest in a flat paper-cut style prompt to match the first eleven) and mapped by programme id in `components/Art.tsx`. They are fictional characters, not real people.
- The other files are the paper-monster scenes for heroes and empty states. The monster is a mascot and doesn't stand for anyone.

Programmes you build yourself get a drawn poster from `components/Art.tsx` instead. The live call keeps its own behaviour: that drawn poster until `/api/portrait` answers.
