# Object model

Status: Draft for review, version 2. Owner: product. Reviewer: engineering.

This page lists the things Pinaka Abhyas is made of. For each one it gives the
word the student sees, what it is, its key attributes, and what it links to. It
describes the product to be built, not the code that exists. It is also the
glossary. A document, a screen, or a commit uses these words and no others. When
the code names a thing, it uses the word on this page.

## 1. Objects

| Object | Word on screen | What it is | Key attributes | Linked to |
|---|---|---|---|---|
| Exam | exam | A real examination the student will sit. Each exam is a Profile on the exam-agnostic Core. | name, paper, blueprint, marking scheme, taxonomy, misconception canon, pass rule (pass mark or rank table) | Pack, Topic, Misconception |
| Pack | question bank | The verified items for one exam, shipped as one versioned file with a manifest. | pack id, version, taxonomy version, item count, minimum app version, a content hash per item | Exam, Item |
| Item | question | One verified question with its key, its explanation, and its executable solution. | id, content hash, item type, difficulty label, the topics it tests, verification status, verification tier, empirical difficulty when calibrated, expected seconds | Pack, Topic, Misconception, Explanation, Attempt |
| Explanation | explanation | The teaching that follows an answer. | four structured sections, an explanation kind, one rationale per option, and the misconception a wrong option targets | Item, Misconception |
| Topic | topic | One node in the exam's taxonomy. Items test topics; the blueprint groups topics into families, sections, and parts. | id, name, family, section, part, mark weight | Item, Mastery, Syllabus coverage, Next action |
| Misconception | misconception | One named wrong way of thinking, from a closed canon per exam. A wrong option can carry one. | id, name, plain-language description | Item, Explanation, Attempt, Diagnosis, Misconception cost |
| Attempt | answer | One answer to one item, recorded once and never changed. It stores the raw response so a later key correction can re-score it. | id, time, item, item content hash, mode, correct or not, raw response, time taken, the misconception selected if any, whether the item was resurfaced | Item, Session, Student state |
| Session | session | One sitting in one mode: practice, review, or mock. | mode, start, end, the attempts made | Attempt, Mock |
| Mock | mock | A timed paper assembled to the exam's blueprint. Three types: standard, which anchors readiness; hard and pace, which train but do not anchor readiness. | type, form, duration, marking scheme, score, marks breakdown, per-question review | Item, Attempt, Readiness, Mock history |
| Mock history | past mocks | Every mock the student has sat. | one row per mock, with type, date, and net score | Mock, Recommendation |
| Mastery | mastery | The student's estimated ability on one topic, with its uncertainty. Updated after every attempt. | rating, uncertainty, attempts, last seen | Topic, Diagnosis, Readiness |
| Schedule | due | When one item comes back, from a spaced-repetition scheduler. | stability, difficulty, due date, lapsed or not | Item, Review queue |
| Student state | progress | Everything the app knows about the student. Rebuilt from attempts and the current pack on every load. Never stored on its own. | mastery per topic, schedule per item, misconception hits, attempt count | Attempt, Mastery, Schedule |
| Diagnosis | diagnosis | What the student does not know, per topic and per misconception, framed in marks. | weak topics, recurring misconceptions, marks lost | Mastery, Misconception cost, Next action |
| Misconception cost | marks lost | Marks lost per misconception, and a matrix of misconception by topic family. | marks per misconception, matrix | Misconception, Diagnosis |
| Next action | next action | The one thing to do now, and why, in marks. The engine chooses it from the student state. | kind (remediate, review, practise, cover), the item or topic, the reason | Diagnosis, Item, Topic |
| Recommendation | recommendation | The app's guidance on the home screen, built from mock history and readiness. | text, the mock or session it points to | Mock history, Readiness |
| Review queue | due for review | Items due now and items due soon. | due now, due soon | Schedule, Item |
| Syllabus coverage | syllabus | How much of the exam's syllabus the student has touched, per chapter. | one of mastered, progressing, touched, untouched, per chapter | Topic, Mastery |
| Readiness | readiness | How close the student is to passing, as an estimate with a range and a confidence. | expected marks, low, high, distance to pass, confidence (not enough data, low, medium), time feasibility, note; always marked as an estimate | Mastery, Mock, Rank band |
| Rank band | rank band | For exams that publish marks and ranks, the range of ranks the expected marks map to. | low rank, high rank, source, year | Readiness, Exam |
| Comparison | other students | Where the student's readiness sits among students who opted in to telemetry. Labelled as a comparison, never a rank. | percentile band, sample size | Readiness, Telemetry record |
| Test day | test day | A screen for exam day. It shows mocks sat, the readiness band, the steadiest topic, and the costliest misconception. It has no action. | the four receipts | Readiness, Mock history |
| Exam attempt | exam attempt | The sitting the student is preparing for, and later its result. | attempt date or session, result when known | Exam, Settings |
| Export | backup | The student's whole history as one file, to keep or to move to another device. Importing merges by attempt id, so a file can be imported twice without harm. | format version, export time, app version, pack id and version, taxonomy version, attempts | Attempt |
| Report | report | A student's report of a problem with an item. It ships inside the export. | item, content hash, reason, time | Item, Export |
| Settings | settings | What the student has chosen. | exam attempt, exam date, readiness target, telemetry on or off, accessibility settings | Exam attempt, Student state |
| First run | first session | The first time the app opens on a device. It asks for nothing before the first session. | completed or not | Settings |
| Telemetry record | none | One anonymous attempt record, sent only when telemetry is on. | item content hash, taxonomy version, difficulty label, correct or not, coarse time bucket, item type, mode, device form factor | Item, Calibration |
| Calibration | none | A build-time job that fits item difficulty from telemetry and consented exports, reviewed by a maintainer before it ships. | per-item difficulty change, response count, review verdict | Item, Telemetry record |
| Verification tier | verified by | How an item was verified. Visible on every item. Machine-verified: a program re-derives the key. Expert-reviewed: two independent blind solves agree. Community: structure checked, correctness not. | tier, evidence | Item, Blind solve |
| Blind solve | none | A contributor's independent answer to an item, given without seeing the key. | contributor, item, answer, working, agrees with key or not | Item, Verification tier |
| Catalogue | exams | The list of packs a student can choose from. | pack id, title, exam, version, item count | Pack, Exam |

## 2. One invariant

Attempts are the only stored record of the student. Every other object about the
student is derived from attempts and the current pack, and can be rebuilt at any
time. This is what makes export and import lossless, and what lets a corrected
key re-score history.

## 3. Actions

What the student can do to each object. Nothing else exists.

| Object | Actions |
|---|---|
| Exam | choose from the catalogue; set the exam attempt, the exam date, and the readiness target |
| Pack | receive an update; the app swaps the pack when safe and re-scores history if a key changed |
| Item | answer; read the explanation; report a problem |
| Session | start practice or review; end it and see the progress evidence |
| Mock | start a standard, hard, or pace mock; pause and resume honestly; submit; see the score, the marks breakdown, and the per-question review |
| Diagnosis | read it; open the topic or the misconception it names |
| Next action | do it |
| Review queue | work through what is due |
| Syllabus coverage | read it; open a chapter |
| Readiness | read it, with its range, its confidence, and its note |
| Rank band | read it, with its source |
| Test day | read it |
| Exam attempt | record the result; set the next attempt |
| Export | export to a file and share it; import a file on another device |
| Student state | delete all data on this device |
| Settings | change the exam attempt, the exam date, and the target; turn telemetry on or off; change accessibility settings |

## 4. Words that must not replace these

The writing rule says one word per thing, every time. These pairs are the ones
most likely to slip.

| Use | Never |
|---|---|
| Pinaka Abhyas, in prose | Abhyas alone, abhyas (the lowercase form is a visual lockup only) |
| item, in code, schema, and engineering documents; question, on screen and in product prose | problem, task, MCQ |
| topic, on screen; node, in the engine | subject, area, skill |
| misconception, on screen and in code | mistake pattern, error type, weakness type |
| attempt, on screen; event, in code | answer record, response record, log entry |
| mock | test, paper, exam (an exam is the real thing the student sits) |
| pack | bank, bundle, dataset |
| Profile | config, variant, template |
| Core | base schema, common schema |
| readiness | score prediction, predicted score, forecast |
| distance to pass | pass margin, gap, headroom |
| next action, on screen and in code | next step, suggestion, tip |
| export | backup file, save file, sync |
| verification tier | trust level, quality level |
| gate | check, test, validator (a validator is the program; the gate is what it enforces) |
