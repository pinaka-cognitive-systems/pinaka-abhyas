def solve():
    import math
    # Find n where P(n,3) = n*(n-1)*(n-2) = 60
    value = None
    for n in range(1, 30):
        if n * (n - 1) * (n - 2) == 60:
            value = n
            break
    # value = 5
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
