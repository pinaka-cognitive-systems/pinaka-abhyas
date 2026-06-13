def solve():
    # CHAIR -> EJCKT: each letter shifted +2
    # Verify
    original = "CHAIR"
    coded_verify = "EJCKT"
    for o, c in zip(original, coded_verify):
        assert ord(c) - ord(o) == 2, f"Shift mismatch at {o}->{c}"

    # Decode FKOOR by subtracting 2
    encoded = "FKOOR"
    decoded = "".join(chr(ord(c) - 2) for c in encoded)
    # decoded should be DIMMP
    options = {1: "DIMMP", 2: "FLOOR", 3: "FLOOM", 4: "DILMP"}
    for k, v in options.items():
        if v == decoded:
            return {"value": decoded, "option_key": k}
    return {"value": decoded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
