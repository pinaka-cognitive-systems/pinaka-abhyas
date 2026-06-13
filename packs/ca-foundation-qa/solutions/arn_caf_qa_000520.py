def solve():
    nX = 70
    nY = 50
    nBoth = 20
    exactly_one = nX + nY - 2 * nBoth  # 80
    ratio_num = exactly_one // 20  # 4
    ratio_den = nBoth // 20  # 1
    assert ratio_num == 4 and ratio_den == 1
    # ratio 4:1 -> option 1
    return {"value": f"{ratio_num}:{ratio_den}", "option_key": 1}

if __name__ == "__main__":
    print(solve())
