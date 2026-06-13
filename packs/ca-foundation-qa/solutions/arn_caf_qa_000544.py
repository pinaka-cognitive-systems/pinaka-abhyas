def solve():
    # Series: 2, 3, 5, 8, 13, 21, ?
    # Rule: Fibonacci-type, each term = sum of previous two
    series = [2, 3, 5, 8, 13, 21]
    next_term = series[-2] + series[-1]  # 13 + 21 = 34
    # options: 1->29, 2->32, 3->34, 4->36
    option_map = {29: 1, 32: 2, 34: 3, 36: 4}
    return {"value": next_term, "option_key": option_map[next_term]}

if __name__ == "__main__":
    print(solve())
