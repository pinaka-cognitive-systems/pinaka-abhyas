def solve():
    # find three consecutive positive integers with product 120
    result = None
    for n in range(1, 50):
        if (n-1)*n*(n+1) == 120:
            result = n + 1  # largest
            break
    assert result is not None, "no solution found"
    # option mapping: 1->4, 2->5, 3->6, 4->7
    options = {1: 4, 2: 5, 3: 6, 4: 7}
    for k, v in options.items():
        if v == result:
            return {"value": result, "option_key": k}

if __name__ == "__main__":
    print(solve())
