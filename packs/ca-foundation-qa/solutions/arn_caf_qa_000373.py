def solve():
    P = 12000
    A = 15360
    T = 4
    SI = A - P  # 3360
    R = SI * 100 / (P * T)  # 7.0
    return {"value": R, "option_key": 1}

if __name__ == "__main__":
    print(solve())
