def solve():
    A = {1, 2, 3}
    R = {(1, 1), (2, 2), (3, 3)}

    # Check reflexive: (a,a) in R for all a in A
    reflexive = all((a, a) in R for a in A)

    # Check symmetric: (a,b) in R => (b,a) in R
    symmetric = all((b, a) in R for (a, b) in R)

    # Check transitive: (a,b) in R and (b,c) in R => (a,c) in R
    transitive = all((a, c) in R for (a, b1) in R for (b2, c) in R if b1 == b2)

    assert reflexive and symmetric and transitive
    # equivalence relation -> option 4
    return {"value": "equivalence", "option_key": 4}

if __name__ == "__main__":
    print(solve())
