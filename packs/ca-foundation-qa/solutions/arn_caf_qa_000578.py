def solve():
    # Code rule: each letter is shifted forward by 3 positions in the alphabet (A->D, B->E, ..., Z->C)
    # FIRM -> F+3=I, I+3=L, R+3=U, M+3=P -> ILUP
    # Options: 1->ILUP, 2->HMQO, 3->GHQP, 4->ILTO
    # HMQO: H=F+2, M=I+4, Q=R-1, O=M+2 - wrong shifts
    # GHQP: G=F+1, H=I-1, Q=R-1, P=M+3 - mixed wrong shifts
    # ILTO: I=F+3, L=I+3, T=R+2, O=M+2 - R shifted by 2 and M shifted by 2 instead of 3

    def shift3(c):
        return chr((ord(c) - ord('A') + 3) % 26 + ord('A'))

    word = "FIRM"
    coded = "".join(shift3(c) for c in word)
    # coded should be ILUP
    correct = "ILUP"
    assert coded == correct, f"Expected ILUP got {coded}"
    return {"value": coded, "option_key": 1}

if __name__ == "__main__":
    print(solve())
