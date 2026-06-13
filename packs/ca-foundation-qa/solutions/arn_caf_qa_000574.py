def solve():
    VOWELS = set("AEIOU")

    def mirror27(c):
        pos = ord(c) - ord('A') + 1
        return chr(ord('A') + 26 - pos)

    def code574(c):
        if c in VOWELS:
            return chr(ord(c) + 3)
        return mirror27(c)

    # Verify example
    assert "".join(code574(c) for c in "TREND") == "GIHMW", \
        f"Example check failed: {''.join(code574(c) for c in 'TREND')}"

    word = "STONE"
    coded = "".join(code574(c) for c in word)
    options = {1: "HGRMH", 2: "HGLMV", 3: "VWLQV", 4: "HGQMG"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
