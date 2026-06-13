def solve():
    # A and B are brothers
    # C and D are sisters
    # A's son is D's brother -> A's son and D are siblings -> A is parent of D (and C)
    # B is A's brother -> B is uncle of A's children -> B is C's uncle
    # Options: 1=Uncle, 2=Father, 3=Brother, 4=Grandfather
    answer = "Uncle"
    option_key = 1
    return {"value": answer, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
