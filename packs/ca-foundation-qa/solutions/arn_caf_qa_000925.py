def solve():
    # Mixed-operation, two-pass series. The operation alternates between
    # "multiply by 2" and "add 3", starting with multiply:
    #   1 -> (x2) -> 2 -> (+3) -> 5 -> (x2) -> 10 -> (+3) -> 13 ->
    #   (x2) -> 26 -> (+3) -> 29
    given = [1, 2, 5, 10, 13, 26]

    # Verify the alternating rule reproduces the given terms exactly.
    def gen(n):
        seq = [1]
        for i in range(n - 1):
            if i % 2 == 0:
                seq.append(seq[-1] * 2)   # multiply by 2 on even index steps
            else:
                seq.append(seq[-1] + 3)   # add 3 on odd index steps
        return seq

    produced = gen(len(given))
    assert produced == given, f"rule does not fit given terms: {produced} vs {given}"

    nxt = gen(len(given) + 1)[-1]  # the next term
    answer = nxt

    options = {1: 39, 2: 29, 3: 52, 4: 23}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
