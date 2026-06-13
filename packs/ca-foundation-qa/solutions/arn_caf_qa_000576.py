def solve():
    def mirror27(c):
        pos = ord(c) - ord('A') + 1
        return chr(ord('A') + 26 - pos)

    def encode(w):
        result = []
        for i, c in enumerate(w):
            mirrored = mirror27(c)
            shifted_ord = ord(mirrored) + (i + 1)
            if shifted_ord > ord('Z'):
                shifted_ord -= 26
            result.append(chr(shifted_ord))
        return "".join(result)

    # Verify both examples
    assert encode("DIGIT") == "XTWVL", f"DIGIT check failed: {encode('DIGIT')}"
    assert encode("BRAND") == "ZKCQB", f"BRAND check failed: {encode('BRAND')}"

    word = "LIGHT"
    coded = encode(word)
    options = {1: "PTWWL", 2: "ORTSG", 3: "MKJLY", 4: "NPQOB"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
