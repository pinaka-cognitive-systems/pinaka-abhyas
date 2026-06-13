def solve():
    # Alternating +3/-3 starting with +3 at position 1
    def encode(w):
        result = []
        for i, c in enumerate(w):
            shift = 3 if i % 2 == 0 else -3
            result.append(chr(ord(c) + shift))
        return "".join(result)

    # Verify example
    assert encode("FLAME") == "IIDJH", f"Example check failed: {encode('FLAME')}"

    word = "STORM"
    coded = encode(word)
    options = {1: "VQROP", 2: "VWRUP", 3: "PWLUJ", 4: "URQPO"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
