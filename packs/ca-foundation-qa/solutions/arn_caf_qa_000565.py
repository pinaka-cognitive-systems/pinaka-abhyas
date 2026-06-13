def solve():
    # Rule: each letter is shifted +1 in the alphabet
    # Verify: MANGO -> NBNHP
    word = "GRAPE"
    coded = "".join(chr(ord(c) + 1) for c in word)
    # coded should be HSBQF
    # Options: 1=HSBQF, 2=GSBQE, 3=HSAQF, 4=IRBQF
    options = {1: "HSBQF", 2: "GSBQE", 3: "HSAQF", 4: "IRBQF"}
    for k, v in options.items():
        if v == coded:
            return {"value": coded, "option_key": k}
    return {"value": coded, "option_key": -1}

if __name__ == "__main__":
    print(solve())
