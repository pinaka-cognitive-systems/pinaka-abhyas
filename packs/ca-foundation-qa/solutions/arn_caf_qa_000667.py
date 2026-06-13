def solve():
    # Frequency density = frequency / class width
    fd_20_30 = 24 / 10   # 2.4
    fd_30_50 = 36 / 20   # 1.8
    # [20-30] has higher frequency density, so taller bar -> option 1
    if fd_20_30 > fd_30_50:
        option_key = 1
    else:
        option_key = 4
    return {"value": fd_20_30, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
