def solve():
    # The four points to test
    points = [(0, 0), (8, 0), (0, 8), (4, 4)]
    count = sum(1 for (x, y) in points if x >= 0 and y >= 0 and x + y <= 8)
    # count = 4; option key 3 has text "4"
    # options: key1="2", key2="3", key3="4", key4="1"
    assert count == 4
    return {"value": count, "option_key": 3}

if __name__ == "__main__":
    print(solve())
