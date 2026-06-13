def solve():
    # Each letter is coded as its position in reverse alphabet (A=26, B=25, ..., Z=1)
    # CALM -> C=24, A=26, L=15, M=14 -> 24 26 15 14
    # Check: CALM coded as reverse-alphabet positions
    word = "CALM"
    coded = [26 - (ord(c) - ord('A')) for c in word]
    # coded = [24, 26, 15, 14]
    # The answer is 24261514
    # Options: 1->24261514, 2->31261514, 3->24261213, 4->24261215
    # Correct: option 1
    return {"value": int("".join(str(x) for x in coded)), "option_key": 1}

if __name__ == "__main__":
    print(solve())
