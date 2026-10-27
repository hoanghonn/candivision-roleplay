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
