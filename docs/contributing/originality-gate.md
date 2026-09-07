# The originality gate

Originality is the legal basis for both licences. The content licence
(`LICENSE-CONTENT.md`) grants rights we can only grant over work we own, and the
commercial licence (`COMMERCIAL.md`) sells that same work. If a shipped question
were copied from an exam board, both grants would fail on that question.

Until September 2026 the pipeline measured a new item against our own bank and
our own reference set. It never compared a shipped item against a real exam
board's published questions. This gate closes that gap.

## What it does

`tools/check_originality.py` runs on every push and in `tools/ci-local.sh`. For
each shipped item it takes the stem and the option texts, cuts them into word
5-grams, and asks what fraction of those 5-grams also appear in a published
reference paper.

The measure is containment, not Jaccard. A short copied question sitting inside
a long paper scores low on Jaccard and high on containment, so containment is the
one that catches copying.

An item fails if it reaches 0.50 containment **and** matches at least five
shingles. The second condition matters: a short item keeps few shingles, so one
coincidental match could otherwise push its ratio over the bar. A failure always
rests on real shared wording.

## How the reference side works without redistributing anything

The reference papers are operator-local and are never committed. What is
committed is `packs/ca-foundation-qa/audit/reference-fingerprints.json`: one-way
hashes of sampled word 5-grams, and no text.

That file lets anyone re-run the gate and check our originality claim for
themselves, and it lets the gate run in public CI, while the papers stay where
they are. Hashes are not a copy.

The shingles are sampled, one in two, for a reason. A complete set of 5-gram
hashes can in principle be chained back into the source text, because consecutive
5-grams overlap by four words. Dropping half the shingles breaks that chaining.

The sample rate was measured, not guessed. At one in four, a third of our items
kept fewer than eight shingles and one kept none at all, so the gate could not
see it: a silent pass, which is worse than no gate. One in two gives a median of
about twenty shingles per item.

Rebuild the file with `tools/build_reference_fingerprints.py` when a reference
paper is added or changed. That script needs the local papers, so only an
operator can run it.

## What it does not do

It catches near-verbatim reuse. It does not catch a competent paraphrase.

Neither does any other word-overlap measure, including the funnel's own 0.80
originality check. Paraphrase detection needs sentence embeddings, and that is
deliberately out of scope: at the overlap levels this bank actually shows, it
would cost real money to restate a conclusion this gate reaches for nothing.

Some items are too short to judge at all. A four-word stem with numeric options
carries no authorship anyone could copy. The gate reports those by name rather
than counting them as passes, because a silent pass would make the numbers look
better than they are.

## Reading the output

The gate prints how many items it actually checked against how many exist, the
highest containment seen, the top five, any item at or above 0.30 as a warning,
and any item it could not judge. Warnings do not fail the build. They are there
to be read.
