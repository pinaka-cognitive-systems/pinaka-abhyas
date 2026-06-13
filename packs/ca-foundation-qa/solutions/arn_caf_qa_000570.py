def solve():
    # Step 1: reverse the word. Step 2: shift each letter +1.
    def encode(w):
        reversed_w = w[::-1]
        return "".join(chr(ord(c) + 1) for c in reversed_w)

    # Verify example
    assert encode("CLAP") == "QBMD", f"Example check failed: {encode('CLAP')}"

    word = "BRING"
    coded = encode(word)
    options = {1: "HOJSC", 2: "CSJOH", 3: "IPKTD", 4: "GNIRB"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
