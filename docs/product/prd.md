# Product requirements: Pinaka Abhyas

Status: Draft for review, version 1. Owner: product. Reviewer: engineering.
This page hangs from `boundary.md` and `objects.md` and cannot contradict them.
It describes the product to be built, not the code that exists.

## 1. Purpose and scope

This page says what the student app must do, screen by screen, and what must be
true across every screen. It also says what the contribution surfaces and the
telemetry must do as the student and the contributor see them. It ends with the
release slices and the success measures.

It does not say how any of it is built. That is `architecture.md`. It does not
say how questions are produced. That is the content pipeline.

Every requirement has an id, a level, and a done test. The level is "must" or
"should". A gap analysis later maps each id to the code.

## 2. The journey

The journey has nine steps. Each step names the job the student is doing, the
requirements, and the test that says the step is done.

### 2.1 Find and open

The job: decide in ten seconds whether this is real and worth my time.

| Id | Level | Requirement |
|---|---|---|
| P-1 | must | The first screen states five facts in plain words: free, no account, works offline, your data stays on your phone, verified questions. It has one action: start. |
| P-2 | must | Nothing is asked before the first session ends. No sign-up, no permission prompt, no install prompt. |
| P-3 | must | The app is usable on the base device on a slow connection within the first-load budget set in `architecture.md`. |
| P-4 | must | The first screen says the app is open source and links to the code. |
| P-5 | should | The install prompt appears after the first session, once, in plain words: install to study offline. |

Done test: a new student reaches the first question within two taps of opening
the link, on the base device.

### 2.2 First session

The job: find out where I stand without being judged.

| Id | Level | Requirement |
|---|---|---|
| P-6 | must | The student picks an exam from the catalogue. With one pack, the choice is implicit and the app names the exam. |
| P-7 | must | The first session is a short baseline that samples every part of the exam's blueprint. It fits in ten to fifteen minutes. |
| P-8 | must | After each answer the app shows whether it was correct, the explanation, and the misconception if the chosen wrong option carried one. |
| P-9 | must | The session ends with one named weakness, which is a topic or a misconception, and one next action with its reason in marks. |
| P-10 | must | Readiness after the first session says "not enough data yet". The app never shows a number the evidence does not support. |
| P-11 | must | Only after the first session, the app offers to record the exam attempt and date. Both are optional and can be skipped. |
| P-12 | must | After the first session, the app asks the browser to keep its storage, and explains in plain words why. |

Done test: after ten to fifteen items a student sees one weakness and one next
action, and no readiness number.

### 2.3 Daily loop

The job: know what to do today, do it, and see that it helped.

| Id | Level | Requirement |
|---|---|---|
| P-13 | must | The home screen shows the next action and its reason, the count of items due for review, the last session's evidence of progress, and readiness in its honest state. |
| P-14 | must | If the student set an exam date, the home screen shows it plainly. It is information, never a timer and never a warning. |
| P-15 | must | A practice session serves items the engine chooses. Each choice has a kind: remediate, review, practise, or cover. |
| P-16 | must | Every answer is followed by the explanation. |
| P-17 | must | The explanation screen has a report-a-problem action. |
| P-18 | must | A session has no fixed length. The student ends it. |
| P-19 | must | The session end shows what moved since the last session and the next action. It shows nothing that makes a struggling student feel worse without a next action. |
| P-20 | must | A review session serves items that are due. An item answered wrongly comes back as that exact item. |
| P-21 | must | Mistakes made in a mock enter the review schedule. |
| P-22 | must | An item served because it was due is marked as resurfaced in the attempt. |

Done test: a student who opens the app on day two sees one next action. A
session of any length ends with evidence of what moved.

### 2.4 Mock

The job: sit the real paper under real conditions, then learn from it.

| Id | Level | Requirement |
|---|---|---|
| P-23 | must | Three mock types exist. A standard mock mirrors the paper: blueprint, marking scheme, duration, and question count. Hard and pace mocks are training variants. |
| P-24 | must | Only standard mocks anchor readiness. Before a mock starts, the app says which type it is and what it counts for. |
| P-25 | must | The exam hall has a question palette, a flag for review, a strike-out for options, the timer, and a submit action with confirmation. |
| P-26 | must | A mock runs entirely on the device. Closing the app or losing the network loses nothing. |
| P-27 | must | Leaving a mock does not stop its clock. The student is told this before starting. If the student returns after the duration has passed, the mock is submitted as it stands. |
| P-28 | must | The score screen shows net marks, distance to pass, time used, and the marks breakdown by part and by misconception. |
| P-29 | must | A per-question review follows, with the explanation for every item. |
| P-30 | must | If the pack cannot fill a full form, the app says so. A short form is labelled and does not anchor readiness. |
| P-31 | must | A mock is pinned to the pack version it started on. A pack update never lands during a mock. |

Done test: a mock started with the phone in flight mode finishes, scores, and
shows the breakdown, with no network at any point.

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
and their costliest misconception. They can start work on either in one tap.

### 2.6 Readiness

The job: know how close I am, honestly.

| Id | Level | Requirement |
|---|---|---|
| P-38 | must | Readiness shows expected marks as a range, the distance to pass, a confidence level, and a note that explains the basis. It is always labelled an estimate. |
| P-39 | must | Confidence has three states: not enough data, low, medium. There is no high. |
| P-40 | must | Readiness is anchored by standard mocks. Practice moves mastery, and mastery informs readiness, but a readiness number needs at least one standard mock. |
| P-41 | must | Time feasibility says whether the student's pace fits the paper and how many items would be skipped for time. It is never framed as ability. |
| P-42 | must | For an exam that publishes marks and ranks, the app shows a rank band with the source and the year on screen. Never a single rank. Never a guarantee. |
| P-43 | must | A comparison to other students appears only when telemetry is on and the sample is large enough. It is labelled as a comparison and never called a rank. |
| P-44 | should | The student may set a readiness target. Progress toward it is shown as evidence, never as pressure. |

Done test: no screen anywhere shows a single predicted score or a confidence
above medium.

### 2.7 Exam day

The job: walk in calm.

| Id | Level | Requirement |
|---|---|---|
| P-45 | must | A test day screen shows four things: mocks sat, the readiness band, the steadiest topic, and the costliest misconception. It has no action and no new information. |
| P-46 | should | The test day screen is offered from the home screen in the last days before the exam date, if one is set. |

Done test: the screen renders from local data with no network and offers
nothing to do.

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
| P-52 | must | Import takes a file and merges it by attempt id. Importing the same file twice changes nothing. The app shows what was added. |
| P-53 | must | An export reminder appears based on days since the last export. It is stronger when the browser reports that storage is not persistent. |
| P-54 | must | Delete all data on this device is available, with a confirmation that names export as the way to keep the data. |
| P-55 | must | The app checks for a pack update on launch when online, downloads it in the background, and swaps it when no mock is in progress. |
| P-56 | must | If a pack update changes an answer key, history is re-scored from the stored raw responses, and the student is told what changed. |
| P-57 | must | The export file format is documented so a student can read their own file. |

Done test: export on one phone, import on another, and the diagnosis and
readiness on both are identical.

### 2.10 Settings

The job: control what the app knows and how it looks.

| Id | Level | Requirement |
|---|---|---|
| P-58 | must | Exam attempt, exam date, and readiness target can be set and changed. |
| P-59 | must | Telemetry is a toggle, off by default. The disclosure next to it lists exactly what each record contains and what it does not. |
| P-60 | must | Accessibility settings cover text size, high contrast, and reduced motion. Every screen honours them. |
| P-61 | must | An about screen shows the app version, the pack version, the licences, a link to the code, and how to report a problem. |

Done test: every setting changes the app immediately and survives a restart.

## 3. Across every screen

| Id | Level | Requirement |
|---|---|---|
| P-62 | must | Every number that is an estimate says so where it is shown. |
| P-63 | must | The phrase "predicted score" appears nowhere. |
| P-64 | must | Every reason the app gives is framed in marks: what a topic is worth, what a misconception has cost. |
| P-65 | must | Everything in section 2 works with no network after first load. |
| P-66 | must | The app makes only these network calls: the app itself, the catalogue, the pack manifest and pack, assets, the optional telemetry send, and the host's page analytics. A build gate enforces this list. |
| P-67 | must | The app is usable on a low-end Android phone within the budgets in `architecture.md`. |
| P-68 | must | Touch targets and type size meet the floor in `architecture.md`. |
| P-69 | must | The app never asks for a name, an email, or a phone number. |
| P-70 | must | Contrast meets 4.5 to 1 for text and 3 to 1 for large text. Focus is visible. Reduced motion is honoured. Screen readers get a label for every control. |
| P-71 | must | Student-facing copy is plain English at CEFR B1. A technical term is defined once, where it first appears. |
| P-72 | must | The refusals in the boundary are enforced in review: no streaks, badges, XP, push notifications, timers, urgency, share buttons, upsells, guarantees, fake instructors, or dark patterns. |
| P-73 | must | Notation renders legibly at 360 pixels of width. |
| P-74 | must | Every image carries alt text that a screen reader can use. |

## 4. Exams

Each exam is a Profile on the exam-agnostic Core. Adding an exam adds a Profile
and, at most, a renderer for a new item type. Nothing else in the app changes.

A Profile supplies:

| Id | Level | Requirement |
|---|---|---|
| P-75 | must | The taxonomy of topics, with families, sections, and parts. |
| P-76 | must | The closed misconception canon for the exam. |
| P-77 | must | The blueprint: how many questions and marks per part, and the allowed deviation. |
| P-78 | must | The marking scheme: marks per correct, per wrong, per unattempted, the question count, and the duration. |
| P-79 | must | The pass rule: a pass mark, or a marks-to-rank table with its source and year. |
| P-80 | must | The item types the exam uses, from the list in section 5. |
| P-81 | must | The notation the exam needs, and whether images are allowed. |
| P-82 | must | A source for every number above, with the date it was checked. |

The exams in order, and what each one adds:

| Exam | Order | What it adds | Pattern |
|---|---|---|---|
| CA Foundation, Paper 3 | first | The base loop. Pass or fail, one paper. | 100 questions, one mark each, minus a quarter for a wrong answer, 120 minutes, pass at 40 net. Parts: Business Mathematics 40, Logical Reasoning 20, Statistics 40. Checked against the exam board's sample paper and weightage. |
| LSAT | second | Stimulus groups: several items on one passage. No negative marking. A scaled score, not a pass mark. | To be confirmed from the official pattern when the Profile is built. |
| JEE | third | Integer type answers. Negative marking. Marks-to-rank tables. Heavy notation. | To be confirmed from the official pattern when the Profile is built. |
| NEET | fourth | Assertion-reason items. Diagrams and images. Marks-to-rank tables. | To be confirmed from the official pattern when the Profile is built. |

Each new exam waits for the one before it to show traction.

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
| P-85 | must | Every type has a renderer that works at 360 pixels of width and with every accessibility setting. |
| P-86 | must | Every type has a plain-language rule for what counts as an attempt and what counts as unattempted. |

## 6. Contribution surfaces

| Id | Level | Requirement |
|---|---|---|
| P-87 | must | Report a problem, for the student: the item, its content hash, a reason from a short list, and free text. It is stored on the device, ships inside the export, and sends nothing. |
| P-88 | must | Blind solve, for a contributor: a separate surface shows an item without its key or explanation and collects an answer and the working. The contributor never sees the key before submitting. |
| P-89 | must | Two independent blind solves that agree with the key raise the item's verification tier. A solve that disagrees opens a defect. |
| P-90 | must | Tag audit, for a contributor: a surface shows an item with its misconception tags and collects agree, or a proposed change with a reason. |
| P-91 | must | The verification tier is visible on every item in the app, with a one-line meaning: machine-verified, expert-reviewed, or community. |
| P-92 | must | Maintainers review and merge everything. No contribution reaches a student without review. |

## 7. Telemetry

| Id | Level | Requirement |
|---|---|---|
| P-93 | must | Telemetry is off by default and turns on only by an explicit choice in settings. |
| P-94 | must | One record is one attempt: item content hash, taxonomy version, difficulty label, correct or not, a coarse time bucket, item type, mode, device form factor, and a coarse ability bucket. Nothing else. |
| P-95 | must | No id of any kind and no exact time leave the device. |
| P-96 | must | The disclosure lists the record above in plain words, says that records cannot be linked to the student, and says that nothing sent can be retrieved. |
| P-97 | must | The student can turn telemetry off at any time. |
| P-98 | must | The student is told what telemetry buys: better difficulty estimates for everyone, and the comparison in section 2.6. |
| P-99 | must | Calibration never changes an answer key, a misconception tag, or the student's own diagnosis. |

## 8. Success and instrumentation

| Measure | Source | Mechanism | Known limit |
|---|---|---|---|
| Reach | The host's cookieless page analytics | Monthly visits | Undercounts offline use. The undercount is stated wherever the number is shown. |
| Learning | Consented export files | A script computes the median change in standard mock score for students with two mocks at least four weeks apart | Only students who share an export count. Telemetry cannot carry this. |
| Trust | The closed beta, then an in-export question | P-100: after the third standard mock, the app asks one optional question: did the diagnosis name your real weakness? The answer is stored on the device and ships in the export. | Only students who share an export count. |

## 9. Release slices

Each slice ships whole. A slice is done when its test passes on the base
device.

| Slice | Contents | Done test |
|---|---|---|
| 1. Closed beta | CA Foundation. Sections 2.1 to 2.7 without the rank band and the comparison. Section 2.9. Section 2.10 without the telemetry send. Section 3. Report a problem. | The closed beta runs. Students return, say the diagnosis named the right weakness, and show a rise in standard mock score. |
| 2. Learn and calibrate | The telemetry send and the collector. Calibration. The after-exam flow. The export reminder. The in-export trust question. | Item difficulty is recalibrated from real data and reviewed before it ships. |
| 3. Second exam | The catalogue. The LSAT Profile. Stimulus group and multi-select. The blind solve surface. | A student picks LSAT, and the app needed no change beyond the Profile and two renderers. |
| 4. Science and engineering exams | JEE and NEET Profiles. Integer type, assertion-reason, matrix match, fill-in-the-blank. Notation and images. The rank band. | A JEE student sees a rank band with its source, and every formula reads at 360 pixels. |

## 10. Open questions

- What evidence of improvement does this student trust? Answered by the closed
  beta.
- Should the export file offer optional passphrase encryption for a shared
  phone?
- How long is the baseline in the first session? Ten to fifteen minutes is the
  target; the beta sets the number.
- Does the exam date on the home screen read as pressure? Answered by the
  closed beta.
