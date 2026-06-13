def solve():
    # Feasible corners for x+y<=10, x<=6, y<=8, x>=0, y>=0
    corners = [(0, 0), (6, 0), (6, 4), (2, 8), (0, 8)]
    # Verify feasibility of each corner
    def feasible(x, y):
        return x + y <= 10 and x <= 6 and y <= 8 and x >= 0 and y >= 0
    for pt in corners:
        assert feasible(*pt), f"Corner {pt} is infeasible"
    # Evaluate profit
    profits = {pt: 5*pt[0] + 4*pt[1] for pt in corners}
    best = max(profits, key=lambda k: profits[k])
    max_profit = profits[best]
    assert max_profit == 46
    # option key 1 text is "46"
    return {"value": max_profit, "option_key": 1}

if __name__ == "__main__":
    print(solve())
