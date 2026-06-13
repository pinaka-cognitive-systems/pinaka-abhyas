def solve():
    # mean proportional m between a and b: m^2 = a * b
    # m = 12, a = 4, find b
    m = 12
    a = 4
    b = (m * m) // a  # = 144 // 4 = 36
    return {"value": b, "option_key": 3}

if __name__ == "__main__":
    print(solve())
