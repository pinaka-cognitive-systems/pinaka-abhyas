def solve():
    frequencies = [4, 11, 18, 12, 5]
    N = sum(frequencies)       # 50
    freq_20_30 = 18
    relative_freq = freq_20_30 / N   # 0.36
    return {"value": relative_freq, "option_key": 1}

if __name__ == "__main__":
    print(solve())
