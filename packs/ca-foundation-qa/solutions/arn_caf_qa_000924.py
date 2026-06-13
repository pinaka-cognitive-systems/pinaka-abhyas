def solve():
    # Conditional, position-dependent letter coding rules:
    #  Rule 1: letters at ODD positions (1st, 3rd, 5th, ...) move FORWARD 2
    #          places in the alphabet.
    #  Rule 2: letters at EVEN positions (2nd, 4th, ...) move BACKWARD 1 place.
    #  Rule 3: but if the original letter is a VOWEL (a, e, i, o, u), it is
    #          instead replaced by the next vowel in the cycle a->e->i->o->u->a,
    #          regardless of position.
    # Alphabet wraps around (z + 1 = a, a - 1 = z).
    # Encode the word "CHAIR".

    alpha = "abcdefghijklmnopqrstuvwxyz"
    vowels = "aeiou"

    def shift(ch, n):
        i = alpha.index(ch)
        return alpha[(i + n) % 26]

    def next_vowel(ch):
        return vowels[(vowels.index(ch) + 1) % len(vowels)]

    def encode(word):
        out = []
        for pos, ch in enumerate(word.lower(), start=1):
            if ch in vowels:
                out.append(next_vowel(ch))           # Rule 3 overrides
            elif pos % 2 == 1:
                out.append(shift(ch, +2))            # Rule 1 odd position
            else:
                out.append(shift(ch, -1))            # Rule 2 even position
        return "".join(out).upper()

    answer = encode("CHAIR")

    # Build distractors by deterministic wrong methods (computed, not guessed),
    # but the OPTIONS in the item are fixed strings; here we only confirm the
    # correct code and which option matches it.
    options = {1: "EGCHT", 2: "EGEOT", 3: "BJEOQ", 4: "EGUET"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
