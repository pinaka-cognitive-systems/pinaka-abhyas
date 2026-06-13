def solve():
    x = [10, 30, 50, 70]
    f = [2, 8, 8, 2]
    n = sum(f)
    mean = sum(xi * fi for xi, fi in zip(x, f)) / n  # 800/20 = 40.0
    abs_devs = [abs(xi - mean) for xi in x]           # 30, 10, 10, 30
    weighted_sum = sum(fi * di for fi, di in zip(f, abs_devs))  # 280
    md = weighted_sum / n  # 280/20 = 14.0
    # 14.0 => option 1
    return {"value": md, "option_key": 1}

if __name__ == "__main__":
    print(solve())
