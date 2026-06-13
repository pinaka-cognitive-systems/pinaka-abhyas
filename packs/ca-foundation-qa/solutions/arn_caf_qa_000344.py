def solve():
    # n1 + n2 = 60, 0.5*n1 + n2 = 45
    # Subtract: 0.5*n1 = 15, n1 = 30, n2 = 30
    n1 = (60 - 45) / 0.5
    n2 = 60 - n1
    return {"value": n2, "option_key": 3}

if __name__ == "__main__":
    print(solve())
