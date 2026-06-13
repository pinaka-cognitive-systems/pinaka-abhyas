def solve():
    # Third proportional to a and b: a:b = b:x => x = b^2 / a
    a, b = 6, 18
    x = (b * b) // a  # = 324 // 6 = 54
    return {"value": x, "option_key": 3}

if __name__ == "__main__":
    print(solve())
