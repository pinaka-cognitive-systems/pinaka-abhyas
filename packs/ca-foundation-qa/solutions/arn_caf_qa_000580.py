def solve():
    # Rule: letters are coded as their mirror positions but the word is reversed
    # Mirror: A<->Z, B<->Y, C<->X, D<->W, E<->V, F<->U, G<->T, H<->S, I<->R, J<->Q, K<->P, L<->O, M<->N
    # mirror(x) = chr(ord('Z') - (ord(x)-ord('A')))
    # THEN word is reversed
    # Given: STAR -> mirror each -> H, G, Z, I -> reverse -> IZGH (let's verify)
    # S=8th from end... S is position 19, mirror = Z-(19-1)=Z-18=chr(90-18)=chr(72)=H
    # T is position 20, mirror = chr(90-19)=chr(71)=G
    # A is position 1, mirror = chr(90-0)=chr(90)=Z
    # R is position 18, mirror = chr(90-17)=chr(73)=I
    # STAR mirror -> H,G,Z,I -> reversed = IZGH
    # Now find code for LAMP:
    # L pos 12, mirror = chr(90-11)=chr(79)=O
    # A pos 1, mirror = Z
    # M pos 13, mirror = chr(90-12)=chr(78)=N
    # P pos 16, mirror = chr(90-15)=chr(75)=K
    # LAMP mirror -> O,Z,N,K -> reversed = KNZO
    # Options: 1->KNZO, 2->ONZK, 3->KNYP, 4->LNZO

    def mirror(c):
        return chr(ord('Z') - (ord(c) - ord('A')))

    def code_word(w):
        mirrored = [mirror(c) for c in w]
        return "".join(reversed(mirrored))

    # Verify with STAR
    assert code_word("STAR") == "IZGH", f"STAR check failed: {code_word('STAR')}"

    result = code_word("LAMP")
    assert result == "KNZO", f"Expected KNZO got {result}"
    return {"value": result, "option_key": 1}

if __name__ == "__main__":
    print(solve())
