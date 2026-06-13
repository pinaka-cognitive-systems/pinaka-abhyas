def solve():
    # Family tree puzzle with gender inference:
    # P is Q's mother. R is Q's father. S is R's father. T is S's wife. U is T's son but not R.
    # V is P's daughter. How is V related to U?
    #
    # Tree:
    # S married T
    #   Children of S and T: R and U (U is T's son but not R)
    # R married P
    #   Children of R and P: Q and V (V is P's daughter)
    #
    # U is R's sibling (both are children of S and T)
    # V is R's child
    # So U is V's uncle (U is sibling of V's father R)
    # U is male (T's son), V is female (P's daughter)
    # U is V's uncle

    # Verify the logic:
    # S & T -> children: R, U
    # R & P -> children: Q, V
    # U is sibling of R (V's father)
    # => U is V's uncle (paternal uncle)

    # Options: 1=Niece, 2=Sister, 3=Aunt, 4=Cousin
    # Wait - the question asks how V is related to U (not U to V)
    # V is U's niece (since U is V's uncle, V is U's niece)
    answer = "Niece"
    option_key = 1
    return {"value": answer, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
