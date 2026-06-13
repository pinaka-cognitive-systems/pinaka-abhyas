def solve():
    # Bank X: 18% monthly
    ear_x = (1 + 0.18 / 12) ** 12 - 1
    # Bank Y: 19% semi-annual
    ear_y = (1 + 0.19 / 2) ** 2 - 1
    diff = ear_y - ear_x
    # EAR_X = 19.56%, EAR_Y = 19.90%, diff = 0.34pp, Bank Y is higher
    # option 1 = "Bank Y by 0.34 percentage points"
    return {"value": round(diff * 100, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
