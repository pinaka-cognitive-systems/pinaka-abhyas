def solve():
    # Rule: reverse the word, then shift each letter forward by 2
    def encode(word, shift):
        rev = word[::-1]
        return ''.join(chr((ord(c) - ord('A') + shift) % 26 + ord('A')) for c in rev)

    # Verify both given examples
    assert encode("STAR", 2) == "TCVU"
    assert encode("FARM", 2) == "OTCH"

    coded = encode("GOLD", 2)  # DLOG+2 = FNQI
    options = {1: "EMPH", 2: "FNQI", 3: "GORJ", 4: "IQNF"}
    option_key = [k for k, v in options.items() if v == coded][0]
    return {"value": coded, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
