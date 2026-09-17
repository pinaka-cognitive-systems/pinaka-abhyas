# Product boundary

Status: Draft for review. It becomes binding when the product owner and the
engineering owner approve the pull request. After that, a change to a non-goal, a
principle, the exam list, or the decision rule needs an ADR.
Owner: product. Reviewer: engineering.

## 1. Purpose

This page says who Abhyas is for, what job it does for them, and what it will not
do. Every PRD, TRD, ADR, and pull request cites it. A feature that does not serve
the job on this page is out.

The words on this page are the words the product uses everywhere. The object model
in `docs/product/objects.md` lists them, with the name each one has in the code.

## 2. The student

One student. Not a set of personas.

- Prepares for a competitive exam. CA Foundation first, then JEE and NEET, then
  others.
- Cannot afford coaching, so studies alone.
- Studies from past papers, YouTube, and Telegram groups today.
- Uses a shared Android phone as the base device. Some have their own phone. Few
  have a computer.
- Is often on metered data, and sometimes offline for hours.
- Reads English. Other languages come later (ADR 0013).
- Is often 16 to 20 years old. Some are under 18.

## 3. The job

The job statement:

> When I prepare for my exam on my own, I want to know where I am behind and what
> to do next. Then I can raise my score and believe I can pass.

The outcomes the student wants, in order:

1. Know which topics and which misconceptions hold my score down.
2. Know the one next thing to do, and why.
3. See my past mistakes come back until I stop making them.
4. See my score move, and know how far I am from passing.
5. Never lose my progress.

The forces that decide whether the student switches:

- Push, away from what they use now: coaching costs too much. Past papers and PDFs
  give no feedback. A video cannot tell me what I do not know.
- Pull, toward Abhyas: verified questions, a diagnosis per topic, free, works
  offline.
- Anxiety, against switching: is this real? Will my data be sold? Will it waste
  the weeks I have left?
- Habit, against switching: Telegram and YouTube are already open on the phone.

The reason a student comes back tomorrow: they feel they are improving and believe
they can score well. That feeling must rest on real evidence. If it does not, the
product is lying.

## 4. What Abhyas is

A free, open-source PWA that runs one loop on one device:

1. The student practises verified questions.
2. The app diagnoses what they do not know, per topic and per misconception.
3. It resurfaces past mistakes on a schedule.
4. It names the single next thing to do.
5. It shows how far they are from passing, as an estimate.

There is no account. No server holds student data. Progress stays on the device
and moves between devices by export and import.

## 5. The Academic OS line

Abhyas serves one student on their own device. Anything that serves an institution
belongs to Academic OS, a separate product with its own code and its own data. An
institution is a school, a coaching centre, a teacher, or a parent.

Teacher analytics, parent apps, class codes, fees, and any dashboard for someone
other than the student live in Academic OS. They never live here. A proposal that
needs one of them is a proposal for the other product.

## 6. Non-goals

These are out. They are not deferred. Only an ADR that changes this page can bring
one in.

- No accounts and no sign-in.
- No server that stores student data.
- No school, teacher, or parent features. No dashboard for anyone but the student.
- No leaderboards.
- No ads, no paid tier for students, and no sales pitch inside the app.
- No runtime AI (ADR 0004).
- No predicted score. Readiness is an estimate and is labelled as one.

These are deferred, not out. Each needs its own decision when its time comes.

- Cross-device sync. For now, progress moves by export and import.
- App store listings. For now, the PWA only (ADR 0001, ADR 0008).
- Languages other than English (ADR 0013).
- Questions authored by outside contributors. Verification help comes first
  (section 9).

## 7. Principles

1. **Free for students, forever.** This holds because a static app has zero
   marginal cost per student. A design with a per-student serving cost breaks it.
2. **Student data stays on the device.** Nothing that can identify a student leaves
   it. Sharing is opt-in and anonymous by construction (ADR 0014).
3. **Honest numbers only.** An estimate is labelled as an estimate. When a number
   rests on a source, the source is shown. The engine never claims a score it
   cannot back.
4. **Every session ends with evidence of progress and a next step.** Nothing makes a
   struggling student feel worse without telling them what to do. No streak
   pressure. No trick that builds a habit without progress.
5. **Works on the base device.** A shared Android phone, metered data, offline after
   first load. The first-load byte budget in ADR 0008 exists for this reason.
6. **Open source is proof.** The app code is public so the claims above can be
   checked. Every shipped item passes the gates. Maintainers hold every merge.

## 8. Exams

CA Foundation Paper 3, Quantitative Aptitude, ships first. JEE and NEET are named
milestones on the roadmap. LSAT and other exams follow.

Each exam is a Profile on the exam-agnostic Core (`schema/core/`,
`schema/profiles/<exam>/`). The engine contract must be exam-agnostic too. Today
that claim is untested, because only one Profile exists. The second Profile is the
test.

The roadmap needs more item types than single best answer and numeric entry.
Multi-select and stimulus group are reserved in ADR 0016. Assertion-reason,
matrix match, fill-in-the-blank, and integer type are not designed yet.

How close the student is to ready is shown per exam:

- CA Foundation is pass or fail. The app shows the distance to pass. The engine
  already computes it as `distanceToPass`.
- JEE and NEET publish marks-to-rank tables for past years. The app shows a rank
  band from those tables, with the source on screen.
- A comparison to other Abhyas students, from opt-in telemetry, is labelled as
  exactly that. It is never called a rank.

## 9. Contribution

Maintainers review and merge every contribution. No path publishes anything to a
student without that review.

The first unit of contribution is verification, not authoring. A contributor
solves an item blind, without seeing the key, and submits their answer and their
working. Two independent solves that agree with the key raise the item's
verification tier. A solve that disagrees opens a defect. Misconception tag audits
and student error reports work the same way.

Authored items and new exams come later. They go through the same schema and the
same gates, and the verification tier is visible on every item.

The content generator stays private for now. A generation-request path may open
first: a contributor names the exam, topic, difficulty, and target misconception,
and a maintainer runs the generator. Opening the generator itself needs its own
ADR.

## 10. Telemetry and calibration

Telemetry is opt-in, off by default, and anonymous by construction (ADR 0014). It
exists for one reason: to calibrate item difficulty on the engine's scale.

Calibration is a build-time batch job. A maintainer runs it, reviews the change to
each item, and merges it through a pull request. Telemetry never changes the
shipped pack on its own. A bad parameter costs some selection efficiency. It never
touches an answer key, a misconception tag, or the student's own diagnosis, which
is computed on their device.

If telemetry cannot be collected, the authored difficulty labels and the FSRS
scheduler carry the app. They carry it today.

## 11. Decision rule

Two roles. The product owner owns this page and the PRD. The engineering owner
owns the architecture, the build, and the delivery, inside this page.

- A change to a non-goal, a principle, the exam list, or this rule needs an ADR.
  The ADR is proposed on a branch and reviewed by both roles.
- Inside the boundary, the engineering owner decides how. The product owner
  reviews and does not redesign.
- Either role may push back on a decision once, in writing, with a reason. Then
  the owner of that area decides.
- A settled decision stays settled until a new ADR supersedes it. Nobody reopens
  a decision in a pull request comment.

## 12. Success

Three numbers, read together. Any one alone can be gamed.

1. Reach: monthly active students.
2. Learning: for students with two mocks at least four weeks apart, the median
   change in mock score.
3. Trust: the share of students who say the diagnosis named the right weakness.

The twelve-month target: tens of thousands of monthly active students, a measured
rise in mock score, and at least one exam live beyond CA Foundation. The size of
the rise is set after the closed beta, not before it.

## 13. Open questions

- What evidence of improvement does this student trust? This is a closed-beta
  research question. Candidates: a mock score rising, mastery per topic, the
  distance to pass.
- Whether to open the content generator. Pending. See section 9.
- A counsel check on the ADR 0014 position before the collector ships.

## References

- `ROADMAP.md`: the v1 definition of done and the two evidence gates.
- `docs/brand/brand-core.md`: free forever and the trust planks.
- `docs/adr/`: the decisions this page cites.
- `engine-ts/SPEC.md`: the engine contract.
- `docs/product/objects.md`: the object model and the glossary.
