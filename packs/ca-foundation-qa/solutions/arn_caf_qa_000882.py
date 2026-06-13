def solve():
    # Real sales = Nominal sales / (Index / 100)
    nominal_y1 = 450000
    index_y1 = 120
    nominal_y2 = 585000
    index_y2 = 156

    real_y1 = nominal_y1 / (index_y1 / 100)  # 450000/1.20 = 375000
    real_y2 = nominal_y2 / (index_y2 / 100)  # 585000/1.56 = 375000

    pct_change = (real_y2 - real_y1) / real_y1 * 100  # 0.0%

    # Answer: 0% change -> option_key 1 ("No change (0%)")
    return {"value": pct_change, "option_key": 1}


if __name__ == "__main__":
    print(solve())
