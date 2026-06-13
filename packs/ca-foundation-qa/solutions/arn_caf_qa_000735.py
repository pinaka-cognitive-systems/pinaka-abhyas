def solve():
    max_val = 80
    min_val = 20
    coeff = (max_val - min_val) / (max_val + min_val)
    # (80 - 20) / (80 + 20) = 60 / 100 = 0.60 => option 2
    return {"value": round(coeff, 2), "option_key": 2}

if __name__ == "__main__":
    print(solve())
