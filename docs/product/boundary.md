# Product boundary

Status: Draft for review, version 3. It becomes binding when the product owner
and the engineering owner approve it. After that, a change to a non-goal, a
principle, or the exam list needs a written decision.
Owner: product. Reviewer: engineering.
Review cadence: after the closed beta, and then once per quarter.

## 1. Purpose

This page says who Pinaka Abhyas is for, what job it does for them, and what it
will not do. It describes the product to be built, not the code that exists. It
sits above every other document. A PRD, a technical design, a decision record, or
a pull request cites it, and none of them can contradict it. A feature that does
not serve the job on this page is out.

The words on this page are the words the product uses everywhere. The object
model in `objects.md` lists them.

## 2. The student

There is one student, not a set of personas.

- Prepares for a competitive exam. CA Foundation comes first, then LSAT, then
  JEE and NEET.
- Usually cannot afford coaching. Studies alone either way, with or without a
  class. The product serves the student, never the coaching centre.
- Studies from past papers, YouTube, and Telegram groups today.
- Uses a shared Android phone as the base device. Some have their own phone. Few
  have a computer.
- Is often on metered data, and sometimes offline for hours.
- Reads English. Other languages come later.
- Is often 16 to 20 years old. Some are under 18.

Who the product is not for: a student inside a coaching centre or a school that
wants to see their progress. That student is served by Academic OS (section 5).
A school pupil with no exam to sit is not served by either product today.

## 3. The job

The job statement:

> When I prepare for my exam on my own, I want to know where I am behind and what
> to do next. Then I can raise my score and believe I can pass.

The outcomes the student wants, in order:

1. Know which topics and which misconceptions hold my score down.
2. Know the one next action, and why.
3. See my past mistakes come back until I stop making them.
4. See my score move, and know how far I am from passing.
5. Keep my progress, and take it with me to another phone.

The forces that decide whether the student switches:

- Push, away from what they use now: coaching costs too much. Past papers and
  PDFs give no feedback. A video cannot tell me what I do not know.
- Pull, toward Pinaka Abhyas: verified questions, a diagnosis per topic, free,
  works offline.
- Anxiety, against switching: is this real? Will my data be sold? Will it waste
  the weeks I have left?
- Habit, against switching: Telegram and YouTube are already open on the phone.

The reason a student comes back tomorrow: they feel they are improving and believe
they can score well. That feeling must rest on real evidence. If it does not, the
product misleads the student.

Four moments the product must serve:

- The switch. A student arrives with weeks left and a mock score that worried
  them. The first screen must answer "is this real" before it asks for anything.
- The first session. It ends with one named weakness and one next action. Readiness
  says "not enough data yet" until the evidence exists. The app never shows an
  early number to look useful.
- Exam day. The app shows what the student has done and says nothing new. There
  is nothing to do on that screen, by design.
- After the exam. The student records the result, or a failed attempt, and sets
  the next attempt. Their history carries over.

## 4. What Pinaka Abhyas is

A free, open-source web app that installs to the phone and runs one loop on one
device:

1. The student practises verified questions.
2. The app diagnoses what they do not know, per topic and per misconception.
3. It resurfaces past mistakes on a schedule.
4. It names the single next action.
5. It shows how far they are from passing, as an estimate.

There is no account. No server holds student data. The app works fully offline
after first load. No server call is needed to practise, to sit a mock, or to see
the diagnosis. Progress stays on the device and moves between devices by export
and import.

Businesses pay for licences. Students never pay. That is how the free product is
funded.

## 5. The Academic OS line

Pinaka Abhyas serves one student on their own device. Anything that serves an
institution belongs to Academic OS, a separate product with its own code and its
own data. An institution is a school, a coaching centre, a teacher, or a parent.

Teacher analytics, parent apps, class codes, fees, school-grade tracks, and any
dashboard for someone other than the student live in Academic OS. They never live
here. A proposal that needs one of them is a proposal for the other product.

## 6. Non-goals

These are out. They are not deferred. Only a written decision that changes this
page can bring one in.

- No accounts and no sign-in.
- No server that stores student data, and no server that the app needs in order
  to work.
- No school, teacher, or parent features. No dashboard for anyone but the student.
- No leaderboards.
- No streaks, badges, XP, daily push notifications, countdown timers, or
  manufactured urgency. No share-this-score buttons, upsell pop-ups, score or
  rank guarantees, fake instructors, or dark patterns of any kind.
- No ads, no paid tier for students, and no sales pitch inside the app.
- No AI at run time. All AI runs at build time. A student needs no API key and no
  internet after first load.
- No predicted score. Readiness is an estimate and is labelled as one.

These are deferred, not out. Each needs its own decision when its time comes.

- Cross-device sync. For now, progress moves by export and import.
- App store listings. For now, the installable web app only.
- Languages other than English.
- A catalogue of packs. More than one pack is in scope; the catalogue is the
  mechanism.
- Questions authored by outside contributors. Verification help comes first
  (section 9).

Where content is authored, in files or in a database, is a build-side choice. It
touches no student data, and the engineering owner decides it.

## 7. Principles

1. **Free for students, forever.** This holds because a static app has a
   near-zero marginal cost per student. Bandwidth is the only per-student cost. A
   design with a per-student serving cost breaks the principle.
2. **Student data stays on the device.** The app sends nothing that can identify
   a student. The export file goes only where the student sends it. If the host
   counts page loads, it sees page loads and never study data. Sharing beyond
   that is opt-in and anonymous by construction (section 10).
3. **Honest numbers only.** An estimate is labelled as an estimate. When a number
   rests on a source, the source is shown. The engine never claims a score it
   cannot back.
4. **Every session ends with evidence of progress and a next action.** Nothing makes
   a struggling student feel worse without telling them what to do. No streak
   pressure. No trick that builds a habit without progress.
5. **Works on the base device, for every student.** A shared Android phone,
   metered data, offline after first load. A first-load byte budget exists for
   this reason. Accessibility settings ship, and a build gate checks contrast,
   type size, touch targets, focus, and reduced motion.
6. **Open source is proof.** The app code is public so the claims above can be
   checked. Every shipped item passes the gates. Maintainers hold every merge.

## 8. Exams

CA Foundation Paper 3, Quantitative Aptitude, ships first. LSAT follows, then JEE
and NEET. Each new exam waits for the one before it to show traction.

Each exam is a Profile on an exam-agnostic Core. The engine takes each exam's
blueprint and marking scheme as parameters. Nothing in the engine is specific to
one exam. The second Profile is the proof of that claim.

Item types the product needs: single best answer, numeric entry, multi-select,
stimulus group, assertion-reason, matrix match, fill-in-the-blank, and integer
type.

How close the student is to ready is shown per exam:

- CA Foundation is pass or fail. The app shows the distance to pass.
- JEE and NEET publish marks and ranks for past years. The app shows a rank band
  from those tables, with the source on screen. A recorded source is a condition
  for shipping the feature.
- A comparison to other Pinaka Abhyas students, from opt-in telemetry, is
  labelled as exactly that. It is never called a rank.

## 9. Contribution

Maintainers review and merge every contribution. No path publishes anything to a
student without that review.

The first unit of contribution is verification, not authoring. A contributor
solves an item blind, without seeing the key, and submits their answer and their
working. Two independent solves that agree with the key raise the item's
verification tier. A solve that disagrees opens a defect. Misconception tag audits
and student error reports work the same way.

A wrong key, when one is found, is recorded in the pack's errata, and the item is
quarantined until it is replaced. A student can report a question from the
explanation screen.

Authored items and new exams come later. They go through the same schema and the
same gates, and the verification tier is visible on every item.

The content generator is private. Outsiders use it through a generation request.
A contributor names the exam, topic, difficulty, and target misconception. A
maintainer runs the generator.

## 10. Telemetry and calibration

Telemetry is opt-in, off by default, and anonymous by construction. Each record
is one attempt: the item, whether it was correct, a coarse time bucket, the mode,
and the device form factor. No student id, no device id, no session id, and no
exact timestamp leave the device. The collector drops the source address before
it stores anything. Because records cannot be linked, telemetry cannot follow one
student over time.

Telemetry exists for one reason: to calibrate item difficulty on the engine's
scale. Calibration is a build-time batch job. A maintainer runs it, reviews the
change to each item, and merges it through a pull request. Telemetry never
changes the shipped pack on its own. A bad parameter costs some selection
efficiency. It never touches an answer key, a misconception tag, or the student's
own diagnosis, which is computed on their device.

If telemetry cannot be collected, the authored difficulty labels and the
scheduler keep the app working.

## 11. Success

Three numbers, read together. Any one alone can be gamed. Each one names how it
is measured, because the privacy rule limits what can be counted.

1. Reach. Monthly visits from the host's cookieless page analytics. This
   undercounts, because an offline session never reaches the network. The
   undercount is stated wherever the number is shown.
2. Learning. For students with two standard mocks at least four weeks apart, the
   median change in mock score. Telemetry cannot carry this, because it holds no
   student id. It is computed from the consented export files of the closed-beta
   cohort, and later from any student who chooses to share an export.
3. Trust. The share of students who say the diagnosis named the right weakness.
   Asked in the closed beta, and later by an optional question that ships inside
   the export file.

The twelve-month target has three parts. Tens of thousands of monthly visits. A
measured rise in mock score in the consented cohorts. At least one exam live
beyond CA Foundation. The size of the rise is set after the closed beta, not
before it.

The stop rule is this. The closed beta must show that students return, find the
diagnosis accurate, and improve. If it does not, the product does not widen to a
second exam. It fixes the loop first.

## 12. Open questions

- What evidence of improvement does this student trust? This is a closed-beta
  research question. Candidates: a mock score rising, mastery per topic, the
  distance to pass.
- A counsel check on the anonymity position in section 10 before the collector
  ships.
