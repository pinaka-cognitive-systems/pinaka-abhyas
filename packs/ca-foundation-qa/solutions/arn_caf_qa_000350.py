def solve():
    # s^2 - 1 = 10*(s-1) => (s-1)(s+1)=10(s-1) => s+1=10 => s=9
    # verify
    s = 9
    father = s * s
    assert father - 1 == 10 * (s - 1), "condition not met"
    # option mapping: 1->7, 2->8, 3->9, 4->10
    options = {1: 7, 2: 8, 3: 9, 4: 10}
    for k, v in options.items():
        if v == s:
            return {"value": s, "option_key": k}

if __name__ == "__main__":
    print(solve())
