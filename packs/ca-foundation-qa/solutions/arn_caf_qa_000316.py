def solve():
    # Fourth proportional to a, b, c: a:b = c:x => x = b*c/a
    a, b, c = 4, 6, 8
    x = (b * c) // a  # = 12
    return {"value": x, "option_key": 2}

if __name__ == "__main__":
    print(solve())
