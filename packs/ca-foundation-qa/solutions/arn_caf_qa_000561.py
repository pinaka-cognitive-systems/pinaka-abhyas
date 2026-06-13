def solve():
    # Rule: each letter is shifted forward by 1 in the alphabet
    # CAT -> DBU: C+1=D, A+1=B, T+1=U (verified)
    # DOG -> ?
    def encode(word, shift):
        result = ""
        for ch in word:
            new_ch = chr((ord(ch) - ord('A') + shift) % 26 + ord('A'))
            result += new_ch
        return result

    # Verify the rule with the given example
    assert encode("CAT", 1) == "DBU"

    coded_word = encode("DOG", 1)  # EPH
    options = {1: "EPG", 2: "EPH", 3: "FPH", 4: "EQH"}
    option_key = [k for k, v in options.items() if v == coded_word][0]
    return {"value": coded_word, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
