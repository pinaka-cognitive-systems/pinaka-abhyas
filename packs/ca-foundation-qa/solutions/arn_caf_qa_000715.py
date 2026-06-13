def solve():
    data = [3, 5, 2, 5, 8, 5, 3, 7, 2, 5]
    freq = {}
    for x in data:
        freq[x] = freq.get(x, 0) + 1
    mode = max(freq, key=lambda k: freq[k])
    option_map = {5: 1, 3: 2, 2: 3}
    return {"value": mode, "option_key": option_map[mode]}

if __name__ == "__main__":
    print(solve())
