def solve():
    # Rule: each letter is shifted forward by 2 positions in the alphabet
    def encode(word, shift):
        return ''.join(chr((ord(c) - ord('A') + shift) % 26 + ord('A')) for c in word)

    # Verify the given example
    assert encode("COLD", 2) == "EQNF"

    coded = encode("WARM", 2)  # YCTO
    options = {1: "XBSN", 2: "YCTO", 3: "ZDUP", 4: "ZCTO"}
    option_key = [k for k, v in options.items() if v == coded][0]
    return {"value": coded, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
