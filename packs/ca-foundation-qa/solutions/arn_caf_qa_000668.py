def solve():
    # Ogive points: cumulative frequency at upper class boundaries
    # (20,5), (40,17), (60,29), (80,38), (100,45)
    N = 45
    median_cf = N / 2  # 22.5
    # Locate segment: 22.5 is between cf=17 (x=40) and cf=29 (x=60)
    L = 40   # lower boundary of segment
    F_below = 17  # cumulative frequency at lower ogive point
    F_above = 29  # cumulative frequency at upper ogive point
    h = 60 - 40  # width of interval = 20
    # Linear interpolation
    x = L + ((median_cf - F_below) / (F_above - F_below)) * h
    # x = 40 + (5.5/12)*20 = 40 + 9.1667 = 49.1667
    return {"value": round(x, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
