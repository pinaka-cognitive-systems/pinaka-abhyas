def solve():
    # Each letter shifted by its 1-indexed position in the word
    def encode(w):
        return "".join(chr(ord(c) + (i + 1)) for i, c in enumerate(w))

    # Verify example
    assert encode("BACK") == "CCFO", f"Example check failed: {encode('BACK')}"

    word = "LIGHT"
    coded = encode(word)
    options = {1: "MKJLY", 2: "LJIKX", 3: "QNLMY", 4: "QMJJU"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
