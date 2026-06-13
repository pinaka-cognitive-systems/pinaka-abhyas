def solve():
    # Rule: each letter is shifted forward by 3 positions in the alphabet
    def encode(word, shift):
        return ''.join(chr((ord(c) - ord('A') + shift) % 26 + ord('A')) for c in word)

    # Verify both given examples
    assert encode("FACE", 3) == "IDFH"
    assert encode("BACK", 3) == "EDFN"

    coded = encode("LAKE", 3)  # ODNH
    options = {1: "NCMG", 2: "NDNH", 3: "ODNH", 4: "PEOI"}
    option_key = [k for k, v in options.items() if v == coded][0]
    return {"value": coded, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
