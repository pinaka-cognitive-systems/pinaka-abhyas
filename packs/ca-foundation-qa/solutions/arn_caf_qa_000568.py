def solve():
    # Mirror rule: original_pos + coded_pos = 27
    # coded_pos = 27 - original_pos
    def mirror27(c):
        pos = ord(c) - ord('A') + 1
        mirror_pos = 27 - pos
        return chr(ord('A') + mirror_pos - 1)

    word = "STAMP"
    coded = "".join(mirror27(c) for c in word)
    # coded should be HGZNK
    options = {1: "HGZNK", 2: "HGANK", 3: "ABIUX", 4: "GFYMJ"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
