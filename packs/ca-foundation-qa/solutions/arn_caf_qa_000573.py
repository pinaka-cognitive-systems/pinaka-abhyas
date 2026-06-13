def solve():
    def encode(w):
        lst = list(w)
        # Swap adjacent pairs starting at index 0
        for i in range(0, len(lst) - 1, 2):
            lst[i], lst[i + 1] = lst[i + 1], lst[i]
        # Shift each +1
        return "".join(chr(ord(c) + 1) for c in lst)

    # Verify example: TRADE -> RTADE -> SUEBF
    assert encode("TRADE") == "SUEBF", f"Example check failed: {encode('TRADE')}"

    word = "PLANT"
    coded = encode(word)
    options = {1: "MQOBU", 2: "QMBOU", 3: "LPNAT", 4: "QBMUO"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
