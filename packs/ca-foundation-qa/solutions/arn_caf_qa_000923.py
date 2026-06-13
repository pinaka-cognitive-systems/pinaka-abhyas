from itertools import permutations


def solve():
    # Three coded sentences. Each word maps to exactly one symbol (a strict
    # one-to-one code). Symbols are unordered within a sentence.
    #   S1: "ban koo dee"  means  "she is clever"
    #   S2: "koo fee zee"  means  "he is tall"
    #   S3: "dee zee moo"  means  "clever tall boy"
    # Question: which symbol stands for "tall"?
    #
    # We brute-force every one-to-one assignment of the symbol set to the
    # word set and keep those consistent with all three sentences (each
    # sentence's symbol set must equal the image of its word set).

    sentences = [
        (frozenset({"ban", "koo", "dee"}), frozenset({"she", "is", "clever"})),
        (frozenset({"koo", "fee", "zee"}), frozenset({"he", "is", "tall"})),
        (frozenset({"dee", "zee", "moo"}), frozenset({"clever", "tall", "boy"})),
    ]

    symbols = sorted({s for syms, _ in sentences for s in syms})
    words = sorted({w for _, wds in sentences for w in wds})
    assert len(symbols) == len(words)

    valid = []
    for perm in permutations(words):
        mapping = dict(zip(symbols, perm))  # symbol -> word
        good = True
        for syms, wds in sentences:
            if {mapping[s] for s in syms} != set(wds):
                good = False
                break
        if good:
            valid.append(mapping)

    # The code for an individual word is unique iff every valid mapping sends
    # the same symbol to "tall". Find the symbol(s) that map to "tall".
    tall_symbols = {sym for m in valid for sym, w in m.items() if w == "tall"}
    assert len(tall_symbols) == 1, f"'tall' not uniquely coded: {tall_symbols}"
    answer = next(iter(tall_symbols))

    options = {1: "koo", 2: "zee", 3: "dee", 4: "moo"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
