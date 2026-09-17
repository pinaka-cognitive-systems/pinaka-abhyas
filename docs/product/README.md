# Product

Product documents for Pinaka Abhyas. They say what the product is, for whom, and
what it will not do. They describe the product to be built, not the code that
exists. They name roles, never people.

- `boundary.md`: the student, the job, the non-goals, the principles, the exams,
  and the success measures. It sits above every other document, and nothing may
  contradict it.
- `objects.md`: the object model and the glossary. One word per thing.
- `prd.md`: what the app must do, screen by screen, with an id per requirement.
  It also covers the exams, the item types, the contribution surfaces,
  telemetry, the success measures, and the release slices.
- `architecture.md`: the two planes, the delivery contract, the local store,
  the engine, the gates, calibration, the threat model, and the budgets. Owned
  by engineering.

A gap analysis comes next and measures the code against these pages.

A change to a non-goal, a principle, or the exam list in `boundary.md` needs a
written decision.
