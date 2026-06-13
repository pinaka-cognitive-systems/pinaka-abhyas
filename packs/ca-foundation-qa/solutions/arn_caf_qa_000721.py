def solve():
    data = [12, 15, 12, 18, 20, 12, 15]
    freq = {}
    for x in data:
        freq[x] = freq.get(x, 0) + 1
    mode = max(freq, key=lambda k: freq[k])
    # mode = 12 -> option 1
    return {"value": mode, "option_key": 1}

if __name__ == "__main__":
    print(solve())
