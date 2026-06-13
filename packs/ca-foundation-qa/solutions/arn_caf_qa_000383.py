def solve():
    # EAR = (1 + r_nominal/m)^m - 1
    # r_nominal = 0.12, m = 12
    # (1.01)^12 = 1.1268 (given)
    ear = 1.1268 - 1  # = 0.1268 = 12.68%
    # Options: 1=12.00%, 2=12.68%, 3=12.36%, 4=11.32%
    return {"value": round(ear * 100, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
