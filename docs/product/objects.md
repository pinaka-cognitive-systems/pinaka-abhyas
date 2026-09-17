# Object model

Status: Draft for review. Owner: product. Reviewer: engineering.

This page lists the things the product is made of. For each one it gives the word
the student sees, the name the code uses, where that name is defined, and what it
links to. It is also the glossary. A document, a screen, or a commit uses these
words and no others. Where the code already has a name, that name wins.

Every code name below was read from the file named next to it on 2026-09-17. Line
numbers drift; file names and identifiers do not.

## 1. Objects

| Object | Word on screen | Name in code | Defined in | Key attributes | Linked to |
|---|---|---|---|---|---|
| Exam | exam | Profile | `schema/profiles/<exam>/` | `blueprint.json`, `marking.json`, taxonomy, misconception canon | Pack, Topic, Misconception |
| Pack | question bank | `pack.json`, `pack.manifest.json`, `PackManifest` | `app/src/sw/manifest.ts` | `pack_id`, `version`, `taxonomy_version`, `item_count`, `min_app_version`, `content_hashes` | Exam, Item |
| Item | question | `BankItem`, and the item record | `engine-ts/src/types.ts`, `schema/core/uqs-core.schema.json` | `id`, `content_hash`, `item_type`, `difficulty_label`, `tests`, `verification_status`, `empirical`, `targets_misconceptions`, `expected_seconds` | Pack, Topic, Misconception, Attempt |
| Topic | topic | node, skill node | `engine-ts/src/types.ts` (`tests`, `nodeId`) | node id such as `qa.bmath.finance`; family, section, part in the blueprint | Item, Mastery, Next action |
| Misconception | mistake pattern | misconception id, `MisconceptionHit` | `engine-ts/src/types.ts` | `selected_misconception` on an attempt; `occurredAtMs`, `eventId`, `nodes` on a hit | Item, Attempt, Diagnosis |
| Attempt | answer | `Event` | `engine-ts/src/types.ts` | `event_id`, `occurredAtMs`, `item_id`, `item_content_hash`, `mode`, `correct`, `response`, `time_ms`, `selected_misconception`, `resurfaced` | Item, Session, Student state |
| Session | session | `Mode` | `engine-ts/src/types.ts` | one of `practice`, `drill`, `review`, `mock` | Attempt |
| Mock | mock | mock form, `MarkingScheme`, `Blueprint` | `app/src/flows/mock/assembler.ts`, `engine-ts/src/types.ts` | `numQuestions`, `durationMinutes`, `passMark`, `marksPerCorrect`, `negativePerWrong` | Item, Attempt, Readiness |
| Mastery | mastery | `SkillState` | `engine-ts/src/mastery.ts` | `rating`, `deviation`, `slowRating`, `lastEventMs`, `attempts`, one per node | Topic, Diagnosis, Readiness |
| Schedule | due | `ItemSchedule` | `engine-ts/src/types.ts` | `stability`, `difficulty` (FSRS, 1 to 10), `dueAtMs`, `lapsed`, `intervalDays`, one per item | Item, Next action |
| Student state | progress | `EngineState` | `engine-ts/src/types.ts` | `skills`, `schedules`, `misconceptions`, `eventCount`, `lastSeenMs`; rebuilt from attempts on every load | Attempt, Mastery, Schedule |
| Diagnosis | diagnosis | the `diagnosis` flow | `app/src/flows/diagnosis/` | read from `EngineState.skills` and `EngineState.misconceptions` | Mastery, Misconception, Next action |
| Next action | next step | `NextAction`, `ActionKind` | `engine-ts/src/types.ts` | `kind` is one of `remediate`, `review`, `practice`, `coverage`, `none`; `itemId`, `nodeId`, `reason` | Diagnosis, Item, Topic |
| Readiness | readiness | `Readiness` | `engine-ts/src/types.ts`, `engine-ts/src/readiness.ts` | `expectedMarks`, `low`, `high`, `distanceToPass`, `confidence`, `isEstimate` (always true), `note` | Mastery, Mock |
| Export | backup | `ExportEnvelope` | `app/src/storage/adapter.ts`, `app/src/storage/envelope.ts` | `format_version`, `exported_at`, `app_version`, `pack_id`, `pack_version`, `taxonomy_version`, `install_id`, `events` | Attempt |
| Settings | settings | the `meta` table, `META_KEYS` | `app/src/storage/sahpool.ts`, `app/src/storage/adapter.ts`, `app/src/state/appData.ts` | `META_EXAM_DATE`, `META_TARGET`, `telemetry_v1`, `a11y_v1`, `install_id`, `app_version`, `pack_id`, `pack_version`, `taxonomy_version` | Student state |

## 2. Storage

The device holds two tables (`app/src/storage/sahpool.ts`):

- `events`: one row per attempt. `event_id`, `occurred_at_ms`, and the full
  attempt as JSON in `payload`. This is the only source of truth (ADR 0009).
- `meta`: key and value. Settings and the `install_id`.

Mastery, schedule, diagnosis, next action, and readiness are never stored. They
are rebuilt from `events` and the current pack on every load.

## 3. Actions

What the student can do to each object. Nothing else exists.

| Object | Actions |
|---|---|
| Exam | choose at first run; set the exam date and the target |
| Pack | receive an update; the app checks the manifest and swaps the pack when safe (ADR 0009) |
| Item | answer; read the explanation; report a problem (planned, section 5) |
| Session | start practice, drill, or review; end it and see the progress evidence |
| Mock | start; pause and resume honestly; submit; see the score, the marks breakdown, and the per-question review |
| Diagnosis | read it; open the topic or the mistake pattern it names |
| Next action | do it |
| Readiness | read it, with its confidence and its note |
| Export | export to a file and share it; import a file on another device |
| Settings | change the exam date and the target; turn telemetry on or off; change accessibility settings |

## 4. Words that must not replace these

The writing rule says one word per thing, every time. These pairs are the ones
most likely to slip.

| Use | Never |
|---|---|
| item, in code and docs; question, on screen | problem, task, MCQ |
| topic, on screen; node, in the engine | subject, area, chapter, skill (except as `SkillState`) |
| misconception, in code and docs; mistake pattern, on screen | error type, bug, weakness type |
| attempt, on screen; event, in code | answer record, response record, log entry |
| mock | test, paper, exam (an exam is the real thing the student sits) |
| pack | bank (the engine's `Bank` type is the in-memory map, not the file), bundle, dataset |
| Profile | config, variant, template |
| Core | base schema, common schema |
| readiness | score prediction, predicted score, forecast |
| distance to pass | pass margin, gap, headroom |
| next action, in code; next step, on screen | recommendation, suggestion, tip |
| export | backup file, save file, sync |
| verification tier | trust level, quality level |
| gate | check, test, validator (a validator is the program; the gate is what it enforces) |

## 5. Not in code yet

These objects are named in the boundary page and have no code name today. Each
one gets its name when it is built, and this page is updated in the same pull
request.

- Rank band: the JEE and NEET range from public marks-to-rank tables.
- Comparison to other Abhyas students: from opt-in telemetry.
- Report: a student's report of a problem with an item. It ships inside the
  export.
- Telemetry tuple: the ADR 0014 payload. The Settings flag exists; nothing sends
  it.
- Verification tier: the visible tier on an item. The schema has
  `verification_status`; the tier that contribution adds is not defined.
- Blind solve: a contributor's independent answer to an item.
- Catalogue: the list of packs a student can choose from. Today the app loads one
  pack from one location.
