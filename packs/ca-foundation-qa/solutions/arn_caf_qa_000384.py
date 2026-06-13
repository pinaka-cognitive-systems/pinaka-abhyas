def solve():
    # EAR = (1 + r/m)^m - 1
    # r = 0.16, m = 4 (quarterly)
    # (1.04)^4 = 1.1699 (given)
    ear = 1.1699 - 1  # = 0.1699 = 16.99%
    # Options: 1=16.00%, 2=16.99%, 3=17.60%, 4=15.68%
    return {"value": round(ear * 100, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
