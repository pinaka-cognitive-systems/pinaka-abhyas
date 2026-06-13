def solve():
    # find n such that (n-1)*n*(n+1) = 60
    result = None
    for n in range(1, 20):
        if (n-1)*n*(n+1) == 60:
            result = n
            break
    assert result is not None, "no solution found"
    # option mapping: 1->3, 2->4, 3->5, 4->6
    options = {1: 3, 2: 4, 3: 5, 4: 6}
    for k, v in options.items():
        if v == result:
            return {"value": result, "option_key": k}

if __name__ == "__main__":
    print(solve())
