def solve():
    # Rule: letters are coded by their positions A=1,...Z=26 but vowels get +1 and consonants get -1
    # Given: BAKE -> (B=2-1=1)(A=1+1=2)(K=11-1=10)(E=5+1=6) -> 1 2 10 6
    # MEND -> (M=13-1=12)(E=5+1=6)(N=14-1=13)(D=4-1=3) -> 12 6 13 3
    # Now find code for VAIN:
    # V=22-1=21, A=1+1=2, I=9+1=10, N=14-1=13 -> 21 2 10 13
    # Options: 1->21 2 10 13, 2->23 2 10 13, 3->21 1 10 13, 4->21 2 8 13

    vowels = set('AEIOU')

    def code_letter(c):
        pos = ord(c) - ord('A') + 1
        if c in vowels:
            return pos + 1
        else:
            return pos - 1

    word = "VAIN"
    coded = [code_letter(c) for c in word]
    # V=22-1=21, A=1+1=2, I=9+1=10, N=14-1=13
    assert coded == [21, 2, 10, 13], f"Got {coded}"
    return {"value": coded, "option_key": 1}

if __name__ == "__main__":
    print(solve())
