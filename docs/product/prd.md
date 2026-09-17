# Product requirements: Pinaka Abhyas

Status: Draft for review, version 2. Owner: product. Reviewer: engineering.
This page hangs from `boundary.md` and `objects.md` and cannot contradict them.
It describes the product to be built, not the code that exists.

## 1. Purpose and scope

This page says what the student app must do, screen by screen, and what must be
true across every screen. It also says what the contribution surfaces and the
telemetry must do as the student and the contributor see them. It ends with the
release slices and the success measures.

It does not say how any of it is built. That is `architecture.md`. Where a
number such as a byte budget lives in `architecture.md`, this page points to it
and does not repeat it. It does not say how questions are produced. That is the
content pipeline.

Every requirement has an id and a level. The level is "must" or "should". Every
section has a done test that a person or a script can run. A gap analysis
later maps each id to the code. In this page, "gap analysis" means that
document and nothing else.

## 2. The journey

The journey has nine steps. Each step names the job the student is doing, the
requirements, and the test that says the step is done.

### 2.1 Find and open

The job: decide in ten seconds whether this is real and worth my time.

| Id | Level | Requirement |
|---|---|---|
| P-1 | must | The first screen states five facts in plain words: free, no account, works offline, your data stays on your phone, every question is verified. It has one action: start. |
| P-2 | must | Nothing is asked before the first session ends, except which exam, and only when more than one is listed. No sign-up, no permission prompt, no install prompt. |
| P-3 | must | The app is usable on the base device on a slow connection within the first-load budget in `architecture.md`. |
| P-4 | must | The first screen says the app is open source and links to the code. |
| P-5 | should | The install prompt appears after the first session, once, in plain words: install to study offline. |
| P-101 | must | "Verified" on the first screen is true of every question the student can see: each one is machine-verified or expert-reviewed. No other tier ships to a student. |
| P-102 | must | If the device already holds attempts, the first screen says so and offers two choices: continue, or export them and start fresh. |

Done test: a new student on the base device reaches the first question within
two taps of opening the link. The first screen shows the five facts and the
link to the code. The install prompt has not appeared.

### 2.2 First session

The job: find out where I stand without being judged.

| Id | Level | Requirement |
|---|---|---|
| P-6 | must | The student picks an exam from the catalogue. With one pack, the choice is implicit and the app names the exam. |
| P-7 | must | The first session is a fixed baseline of ten to fifteen items that samples every part of the exam's blueprint. It is the one session with a fixed length. |
| P-8 | must | After each answer the app shows whether it was correct, the explanation, and the misconception if the chosen wrong option carried one. |
| P-9 | must | The session ends with one named weakness at the level the baseline can support, which is a part or a family, with its uncertainty stated. It also ends with one next action and its reason in marks. |
| P-10 | must | Readiness after the first session says "not enough data yet". The app never shows a number the evidence does not support. |
| P-11 | must | Only after the first session, the app offers to record the exam attempt and date. Both are optional and can be skipped. |
| P-12 | must | After the first session, the app asks the browser to keep its storage, and explains in plain words why. |

Done test: after the baseline a student sees one weakness with its uncertainty,
one next action, and no readiness number. The exam attempt and the storage
request were offered after that, and both could be skipped.

### 2.3 Daily loop

The job: know what to do today, do it, and see that it helped.

| Id | Level | Requirement |
|---|---|---|
| P-13 | must | The home screen shows four things: the next action with its reason, the count of items due for review, the last session's evidence of progress, and readiness in its honest state. |
| P-14 | must | If the student set an exam date, the home screen shows it plainly. It is information, never a timer and never a warning. |
| P-15 | must | A practice session serves items the engine chooses. Each choice has a kind: remediate, review, practise, or cover. |
| P-16 | must | Every answer is followed by the explanation. |
| P-17 | must | The explanation screen has a report-a-problem action. |
| P-18 | must | A session after the first has no fixed length. The student ends it. |
| P-19 | must | The session end shows what moved since the last session and the next action. It shows nothing that makes a struggling student feel worse without a next action. |
| P-20 | must | A review session serves items that are due. An item answered wrongly comes back as that exact item. |
| P-21 | must | Mistakes made in any mock, standard, hard, or pace, enter the review schedule. |
| P-22 | must | An item served because it was due is marked as resurfaced in the attempt. |
| P-103 | must | No item is served so often that a student can learn it by memory. The engine limits how often one item appears. |

Done test: a student who opens the app on day two sees the four things on the
home screen. A session of any length ends with evidence of what moved and a
next action. A wrongly answered item returns as that item in a review session.

### 2.4 Mock

The job: sit the real paper under real conditions, then learn from it.

| Id | Level | Requirement |
|---|---|---|
| P-23 | must | Three mock types exist. A standard mock mirrors the paper: blueprint, marking scheme, duration, and question count. Hard and pace mocks are for training. |
| P-24 | must | Only standard mocks anchor readiness. Before a mock starts, the app says which type it is and what it counts for. |
| P-25 | must | The exam hall has a question palette, a flag for review, a strike-out for options, the timer, and a submit action with confirmation. |
| P-26 | must | A mock runs entirely on the device. Closing the app or losing the network loses no answer. |
| P-27 | must | There is no pause. Leaving a mock does not stop its clock, and the student is told this before starting. If the student returns after the duration has passed, the mock is submitted as it stands. |
| P-28 | must | The score screen shows net marks, distance to pass, time used, and the marks breakdown by part and by misconception. |
| P-29 | must | A per-question review follows, with the explanation for every item. |
| P-30 | must | If the pack cannot fill a full standard form, the app says so and does not offer a standard mock until it can. |
| P-31 | must | A pack update never lands during a mock. |
| P-104 | must | The student can see every past mock: its type, its date, and its net marks. |

Done test: a mock started with the phone in flight mode finishes, scores, and
shows the breakdown, with no network at any point. A mock left for longer than
its duration is found submitted.

### 2.5 Diagnosis

The job: understand exactly what is holding my score down.

| Id | Level | Requirement |
|---|---|---|
| P-32 | must | Per topic, the diagnosis shows mastery with its uncertainty, in words a student understands, and the marks at stake in that topic. |
| P-33 | must | Recurring misconceptions are ranked by marks lost. Each has a plain description and the attempts where it occurred. |
| P-34 | should | A matrix of misconception by topic family appears once the student has enough attempts to fill it. |
| P-35 | must | Syllabus coverage shows each chapter as mastered, progressing, touched, or untouched. |
| P-36 | must | Empty and early states say what is missing and how to get it. They never show a blank chart. |
| P-37 | must | Every line in the diagnosis leads to an action: open the topic, practise the misconception, or review the attempts. |

Done test: a student with three sessions of data can name their weakest topic
and their costliest misconception. They can start work on either in one tap. A
student with one session sees the early state, not a blank chart.

### 2.6 Readiness

The job: know how close I am, honestly.

| Id | Level | Requirement |
|---|---|---|
| P-38 | must | Readiness shows expected marks as a range, the distance to pass, a confidence level, and a note that explains the basis. It is always labelled an estimate. |
| P-39 | must | Confidence has three states: not enough data, low, medium. There is no high. |
| P-40 | must | Readiness is anchored by standard mocks. Practice moves mastery, and mastery informs readiness, but a readiness number needs at least one standard mock. |
| P-41 | must | Time feasibility says whether the student's pace fits the paper and how many items would be skipped for time. It is never framed as ability. |
| P-42 | must | For an exam that publishes marks and ranks, the app shows a rank band with the source and the year on screen. Never a single rank. Never a guarantee. |
| P-43 | must | A comparison to other students reads a published aggregate: the spread of ability bands among students who opted in, per exam. It appears only when the aggregate exists and its sample is large enough. It is labelled as a comparison and never called a rank. |
| P-44 | should | The student may set a readiness target. Progress toward it is shown as evidence, never as pressure. |
| P-105 | must | Where an exam has a pass rule beyond the paper, the readiness note says which bar the distance to pass covers. For CA Foundation it covers Paper 3 only, and the note says so. |

Done test: no screen anywhere shows a single predicted score or a confidence
above medium. The readiness note names the bar it measures. The comparison is
absent when no aggregate is on the device.

### 2.7 Exam day

The job: walk in calm.

| Id | Level | Requirement |
|---|---|---|
| P-45 | must | A test day screen shows four things: mocks sat, the readiness band, the steadiest topic, and the costliest misconception. It has no action and no new information. |
| P-46 | must | The test day screen has a fixed place in the app. Nothing about the exam date triggers it. |

Done test: the screen renders from local data with no network and offers
nothing to do. It is reachable on any day.

### 2.8 After the exam

The job: close this attempt and start the next one without losing anything.

| Id | Level | Requirement |
|---|---|---|
| P-47 | must | The student can record the result: marks, pass or fail, or did not sit. |
| P-48 | must | The student can set the next attempt. |
| P-49 | must | History carries over. Mastery carries over. Readiness for the next attempt needs a new standard mock before it shows a number. |
| P-50 | must | The app never deletes anything on its own. |

Done test: a student who records a failed attempt and sets the next one keeps
every attempt and sees an honest readiness state.

### 2.9 Keep my progress

The job: never lose what I have done, and take it to another phone.

| Id | Level | Requirement |
|---|---|---|
| P-51 | must | Export is one action that produces one file and hands it to the device's share sheet. The student can send it to a drive, a chat, or a folder. |
| P-52 | must | Import takes a file and merges its attempts by attempt id, and takes its settings if the device has none. Importing the same file twice changes nothing. The app shows what was added. |
| P-53 | must | An export reminder appears based on days since the last export. It is stronger when the browser reports that storage is not persistent. |
| P-54 | must | Delete all data on this device is available, with a confirmation that names export as the way to keep the data. |
| P-55 | must | The app checks for a pack update on launch when online. It shows the size and asks before downloading on a metered connection. The download runs in the background, and the swap waits until no mock is in progress. |
| P-56 | must | If a pack update changes an answer key, history is re-scored from the stored raw responses, and the student is told what changed. |
| P-57 | must | The export file format is documented so a student can read their own file. |
| P-106 | must | An export holds attempts, reports, and settings. It holds no name, no contact detail, and no free text. |
| P-107 | must | If an import comes from a different pack or taxonomy version, the app says so and merges what it can. It never silently drops attempts. |
| P-108 | must | An item that is quarantined by an update is never served again. Attempts on it stay in history and stop counting toward readiness. The student is told in the update note. |

Done test: export on one phone, import on another, and the diagnosis, the
readiness, and the settings on both are identical. Importing the same file a
second time adds nothing.

### 2.10 Settings

The job: control what the app knows and how it looks.

| Id | Level | Requirement |
|---|---|---|
| P-58 | must | Exam attempt, exam date, and readiness target can be set and changed. |
| P-59 | must | Telemetry is a toggle, off by default. The disclosure next to it lists exactly what each record contains and what it does not. |
| P-60 | must | Accessibility settings cover text size, high contrast, and reduced motion. Every screen honours them. |
| P-61 | must | An about screen shows the app version, the pack version, the licences, a link to the code, and how to report a problem. |

Done test: every setting changes the app immediately and survives a restart.
The about screen shows both versions.

### 2.11 Hard cases

The job: keep working when something goes wrong.

| Id | Level | Requirement |
|---|---|---|
| P-109 | must | If the first pack download fails, the app says so in plain words, keeps the shell, and offers to retry. |
| P-110 | must | If a pack update stops half way, the previous pack keeps working and nothing is lost. The app retries later. |
| P-111 | must | If the browser cannot give the app durable storage, the app says so on the home screen, keeps working in memory, and urges an export at the end of every session. |
| P-112 | must | If the app opens inside another app's browser, such as a chat app, it says so and shows how to open it in the phone's browser. It still works in the meantime. |
| P-113 | must | If the device clock jumps, the mock clock and the review schedule keep working from elapsed time, and the app tells the student the date looks wrong. |
| P-114 | must | Two exams on one device keep separate progress. Switching between them loses nothing. |
| P-115 | must | Every error the student can see is in plain words, says what to do next, and offers a copy-the-details action. No blank screen. |

Done test: each case above is produced on the base device, and the student can
continue.

## 3. Across every screen

| Id | Level | Requirement |
|---|---|---|
| P-62 | must | Every number that is an estimate says so where it is shown. |
| P-63 | must | The phrase "predicted score" appears nowhere. |
| P-64 | must | Every reason in the diagnosis and every next action is framed in marks: what a topic is worth, what a misconception has cost. |
| P-65 | must | Everything in section 2 works with no network after first load. |
| P-66 | must | The app makes only the network calls listed in `architecture.md`, and a build gate enforces that list. |
| P-67 | must | The app meets the device budgets in `architecture.md`. |
| P-68 | must | The app meets the type, touch, and contrast floors in `architecture.md`. |
| P-69 | must | The app never asks for a name, an email, or a phone number. |
| P-70 | must | Focus is visible. Reduced motion is honoured. Screen readers get a label for every control. |
| P-71 | must | Student-facing copy is plain English at CEFR B1, checked with a readability tool against a stated threshold. A technical term is defined once, where it first appears. |
| P-72 | must | The refusals in the boundary are a checklist in the review of every screen. No screen ships with an item on that list. |
| P-73 | must | Notation renders legibly at the width floor in `architecture.md`. |
| P-74 | must | Every image carries alt text that a screen reader can use. |
| P-116 | must | Copy never blames the student. It names what happened and what to do next. |

Done test: a script finds no "predicted score", no unlabelled estimate, no
control without a label, and no copy above the readability threshold. A
reviewer signs the refusals checklist for every screen.

## 4. Exams

Each exam is a Profile on the exam-agnostic Core. Adding an exam adds a Profile
and, at most, a renderer for a new item type. Nothing else in the app changes.

| Id | Level | Requirement |
|---|---|---|
| P-75 | must | A Profile supplies the taxonomy of topics, with families, sections, and parts, at a grain fine enough to name a weakness and coarse enough to fill with data. |
| P-76 | must | A Profile supplies the closed misconception canon for the exam. |
| P-77 | must | A Profile supplies the blueprint: questions and marks per part, and the allowed deviation. |
| P-78 | must | A Profile supplies the marking scheme: marks per correct, per wrong, per unattempted, the question count, and the duration. |
| P-79 | must | A Profile supplies the pass rule, which is a pass mark or a marks-to-rank table with its source and year. |
| P-80 | must | A Profile lists the item types the exam uses, from section 5. |
| P-81 | must | A Profile states the notation the exam needs and whether images are allowed. |
| P-82 | must | A Profile gives a source for every number above, with the date it was checked. |

The exams in order, and what each one adds:

| Exam | Order | What it adds | Pattern |
|---|---|---|---|
| CA Foundation, Paper 3 | first | The base loop. One paper with a pass mark. | 100 questions of one mark each, minus a quarter mark for a wrong answer, 120 minutes, pass at 40 net. Business Mathematics has 40 questions, Logical Reasoning 20, Statistics 40. Source: the exam board's sample paper for May 2025 and its published section weightage. The date of the last check is recorded in the Profile. |
| LSAT | second | Stimulus groups: several items on one passage. A scaled score in place of a pass mark. | To be confirmed from the official pattern when the Profile is built, including whether wrong answers cost marks. |
| JEE | third | Integer type answers. Heavy notation. | To be confirmed from the official pattern when the Profile is built, including the marking and whether marks-to-rank tables are published. |
| NEET | fourth | Assertion-reason items. Diagrams and images. | To be confirmed from the official pattern when the Profile is built, including the marking and whether marks-to-rank tables are published. |

Each new exam waits for the one before it to show traction.

Done test: a new Profile passes the gates with every field in P-75 to P-82
present and sourced. The app runs it with no code change beyond renderers.

## 5. Item types

| Type | Answer key | Raw response | Marking |
|---|---|---|---|
| Single best answer | one option | the option chosen | per the marking scheme |
| Numeric entry | a number with a tolerance | the number typed | exact within tolerance |
| Multi-select | a set of options | the set chosen | per the Profile: all or nothing, or partial |
| Stimulus group | one key per item in the group | one response per item | per item |
| Assertion-reason | one of the fixed four verdicts | the verdict chosen | per the marking scheme |
| Matrix match | a map from each row to its columns | the map chosen | per the Profile: per row, or all or nothing |
| Fill-in-the-blank | an accepted set of strings, or a number | the text typed | exact or within tolerance |
| Integer type | an integer | the integer typed | exact |

| Id | Level | Requirement |
|---|---|---|
| P-83 | must | Every type stores the raw response, and a later key correction can re-score it. |
| P-84 | must | A Profile enables the types it uses. An item cannot use a type its Profile has not enabled. |
| P-85 | must | Every type has a renderer that works at the width floor and with every accessibility setting. |
| P-86 | must | Every type has a plain-language rule for what counts as an attempt and what counts as unattempted. |
| P-117 | must | Every explanation has the same fixed sections for every exam, and one rationale per option. |

Done test: for each type, an item is answered, re-scored after a key change,
and rendered at the width floor with every accessibility setting on.

## 6. Contribution surfaces

| Id | Level | Requirement |
|---|---|---|
| P-87 | must | Report a problem, for the student: the item, its content hash, and one reason from this list: the answer key is wrong, the explanation is wrong, the question is unclear, a typo or formatting problem, something else. No free text. It is stored on the device, ships inside the export, and sends nothing. |
| P-88 | must | Blind solve, for a contributor: a separate surface shows an item without its key or explanation and collects an answer and the working. The contributor never sees the key before submitting. |
| P-89 | must | Two independent blind solves that agree with the key raise the item's verification tier. A solve that disagrees opens a defect. |
| P-90 | must | Tag audit, for a contributor: a surface shows an item with its misconception tags and collects agree, or a proposed change with a reason. |
| P-91 | must | The verification tier is visible on every item in the app, with a one-line meaning: machine-verified or expert-reviewed. |
| P-92 | must | Maintainers review and merge everything. No contribution reaches a student without review. |

Done test: a contributor completes a blind solve without ever seeing the key.
A student's report appears in their export with a reason from the list and no
free text.

## 7. Telemetry

| Id | Level | Requirement |
|---|---|---|
| P-93 | must | Telemetry is off by default and turns on only by an explicit choice in settings. |
| P-94 | must | One record is one attempt. It holds the item content hash, the taxonomy version, the difficulty label, correct or not, a coarse time bucket, the item type, the mode, the device form factor, and an ability band with five levels. Nothing else. |
| P-95 | must | No id of any kind and no exact time leave the device. Records cannot be linked to each other or to a student. |
| P-96 | must | The disclosure lists the record in plain words. It says that records cannot be linked to the student, and that nothing sent can be retrieved. |
| P-97 | must | The student can turn telemetry off at any time. |
| P-98 | must | The student is told what telemetry buys: better difficulty estimates for everyone, and the comparison in section 2.6. |
| P-99 | must | Calibration never changes an answer key, a misconception tag, or the student's own diagnosis. |
| P-118 | must | Sharing an export with the project is a separate, explicit act with its own consent text. The text says what the file holds and who reads it. A student under 18 is asked to share it through a parent. |

Done test: with telemetry off, the network allowlist gate records no telemetry
call. With it on, a captured record holds exactly the fields in P-94.

## 8. Success and instrumentation

| Measure | Source | Mechanism | Known limit |
|---|---|---|---|
| Reach | The host's cookieless page analytics | Monthly visits | Undercounts offline use. The undercount is stated wherever the number is shown. |
| Learning | Consented export files | A script computes the median change in standard mock score for students with two mocks at least four weeks apart | Only students who share an export count. Telemetry cannot carry this. |
| Trust | The closed beta, then an in-export question | In the beta, a conversation with each student. Later, P-100: after the third standard mock, the app asks one optional question: did the diagnosis name your real weakness? The answer is stored on the device and ships in the export. | Only students who share an export count. |

## 9. Release slices

Each slice ships whole. A slice is done when its test passes on the base
device.

| Slice | Contents | Done test |
|---|---|---|
| 1. Closed beta | CA Foundation with single best answer and numeric entry. Sections 2.1 to 2.7 without the rank band and the comparison. Sections 2.8 to 2.11. Section 3. Report a problem and the verification tier on every item. | The closed beta runs. Students return, say in conversation that the diagnosis named the right weakness, and show a rise in standard mock score. |
| 2. Learn and calibrate | The telemetry send, the collector, and the published aggregate. Calibration. The in-export trust question. Sharing an export with the project. | Item difficulty is recalibrated from real data and reviewed before it ships. The comparison appears for a student with telemetry on. |
| 3. Second exam | The catalogue. The LSAT Profile. Stimulus group and multi-select. The blind solve and tag audit surfaces. | A student picks LSAT, and the app needed no change beyond the Profile and two renderers. |
| 4. Science and engineering exams | JEE and NEET Profiles. Integer type, assertion-reason, matrix match, fill-in-the-blank. Notation and images. The rank band. | A JEE student sees a rank band with its source, and every formula reads at the width floor. |

## 10. Open questions

- What evidence of improvement does this student trust? Answered by the closed
  beta.
- Should the export file offer optional passphrase encryption for a shared
  phone?
- How many items make the baseline? Ten to fifteen is the target; the beta
  sets the number.
- Does the exam date on the home screen read as pressure? Answered by the
  closed beta.
