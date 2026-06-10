# Test fixture pack

`pack.json` here is a **test fixture copy** of the first five items of the real
CA Foundation QA pack. It is NOT the shipped pack and is never bundled into the
app — it exists only so the engine-integration tests (`app/tests/engine/`) can
run against a real pack shape without requiring Python (the pack build script,
`packs/ca-foundation-qa/build_and_validate.py`, needs `jsonschema`/`referencing`)
to run in app CI.

## Provenance

Derived from `packs/ca-foundation-qa/pack.json` (the build artifact produced by
`packs/ca-foundation-qa/build_and_validate.py`), items `arn_caf_qa_000001`
through `arn_caf_qa_000005`, verbatim including their stamped `content_hash`.

These five items span four blueprint families and difficulty labels L1 and L2,
and carry per-option misconception targeting, so the integration layer's
bank/blueprint/misconception transforms are exercised on real data.

## Regeneration

Re-create after the real pack changes by re-running the build and copying the
first five items:

```sh
python3 packs/ca-foundation-qa/build_and_validate.py
python3 -c "import json,pathlib; \
  p=json.load(open('packs/ca-foundation-qa/pack.json')); \
  pathlib.Path('app/tests/fixtures/pack.json').write_text( \
    json.dumps({'items':p['items'][:5],'assets':[]}, indent=2, ensure_ascii=False)+'\n')"
```

Run from the repo root.
