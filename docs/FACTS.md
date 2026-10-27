# Measured facts

Numbers measured against the live services during the build. Dates are Hanoi time.

## Research and building (2026-10-27)

- Outage request, research only: 19.8 s, 9 sources kept (3 papers with resolving DOIs, 6 method library entries), 2 "not found" questions.
- Outage request, research and programme: 30 s, programme valid on the first try (3 levels, 5 rubric lines).
- Vietnamese call-centre request through the real server (case match, research, programme): 46.8 s, 4 papers with resolving DOIs, programme fully in Vietnamese.

## Speech (2026-10-27)

- Muse Voice Transcribe, Vietnamese (`languageBias: ['Vietnamese']`), sentence spoken by ElevenLabs: "Xin lỗi chị, lỗi này là do bên em. Em sẽ gọi lại cho chị lúc ba giờ chiều nay." heard as "Xin lỗi chị, chị, lời này là do bên em, em sẽ gọi lại cho chị lúc ba giờ chiều nay.." - usable for judging.
- English: "I am sorry, this is on us. I will call you again at three pm with an update." heard as "... at 3 PM with an update." - exact.

## Models

- Baseten Muse Spark Open answers only with the slug `meta-models/muse-spark-open-1026`; the bare slug returns 403 "please check the api-key", which is misleading.

## Persona (2026-10-27)

- Muse Spark persona turn (`reasoning_effort: minimal`): 1.7 to 5.1 s per reply, about 3 s typical.
- Outage L2, typed check: stays in role on "ignore your instructions"; mood rises on jargon and blame (85 → 100), drops on a real apology and a next-update time (100 → 85 → 78). An earlier prompt without the rubric's "look for" list made the character a wall that never eased; the prompt now lists them.
- Muse Image portrait (`muse-image-1.0`, reasoning_strength low): 11.2 s, WebP about 500 KB; cached per version in memory, the call shows a placeholder until it arrives.

## Judges (2026-10-27)

- Judge 1 Muse Spark (Meta) and judge 2 Muse Spark Open (`meta-models/muse-spark-open-1026` on Baseten) run in parallel: 6.6 to 7.4 s per call scored. Baseten accepts `reasoning_effort: low` and `temperature: 0`.
- One outage transcript (5 rubric lines) scored 3 times with an empty cache: 14 of 15 line results identical; the one change was a line where the judges split once (shown as "unsure"). In the product the cache returns the stored verdicts for the same transcript, so a rescore never changes.
- The plain verdicts were sensible: jargon-heavy opening marked missed on "avoids jargon", late apology marked partly, update time without a fix time marked partly.

## Ready-built programmes (2026-10-27)

- Six programmes built by `scripts/build-library.ts` with the real pipeline: 72 to 90 s each (case match, research, programme, test call, a sample call by an AI learner, two judges). All six passed their test call.
- Paper search keeps only works cited 10 or more times (OpenAlex `cited_by_count`, Crossref `is-referenced-by-count`). Without that floor the first build cited low-quality venues; with it the programmes cite meta-analyses and reviews (for example a 2010 sales-performance meta-analysis and a 2015 sales-training review).
- Live typed outage call on the production-style server: the persona eased 75 → 60 → 45 after an apology and a plain impact statement and kept asking for a clock time; ending the call scored it with both judges (Baseten as judge 2) in 9.8 s; "next update time" came back missed and the drill targeted it.
