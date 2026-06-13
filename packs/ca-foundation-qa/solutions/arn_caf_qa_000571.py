def solve():
    VOWELS = set("AEIOU")

    def code571(c):
        if c in VOWELS:
            return chr(ord(c) - 1)
        return chr(ord(c) + 3)

    # Verify example
    assert "".join(code571(c) for c in "GIFT") == "JHIW", \
        f"Example check failed: {''.join(code571(c) for c in 'GIFT')}"

    word = "BLEND"
    coded = "".join(code571(c) for c in word)
    options = {1: "EODQG", 2: "EOHQG", 3: "AKHMC", 4: "DNDPF"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
