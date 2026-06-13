def solve():
    # Odd word-positions (1,3,5,...) shift +2, even (2,4,...) shift -2
    def code569(w):
        result = []
        for i, c in enumerate(w):
            if (i + 1) % 2 == 1:  # odd position
                result.append(chr(ord(c) + 2))
            else:
                result.append(chr(ord(c) - 2))
        return "".join(result)

    # Verify example
    assert code569("DIGIT") == "FGIGV", f"Example check failed: {code569('DIGIT')}"

    word = "FORCE"
    coded = code569(word)
    options = {1: "HMTAG", 2: "HQTEG", 3: "DMPAC", 4: "DQPEC"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
