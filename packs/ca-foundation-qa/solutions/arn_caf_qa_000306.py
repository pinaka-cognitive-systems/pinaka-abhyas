def solve():
    A = 25000
    factor = 1.4641  # (1.10)^4 as given
    P = A / factor
    # P = 17075.744... rounds to 17075.75
    return {"value": round(P, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
