def solve():
    r_nom = 0.08
    m = 4
    ear = (1 + r_nom / m) ** m - 1
    # (1.02)^4 - 1 = 0.08243216... => 8.24%
    excess_pct = ear - r_nom
    basis_points = round(excess_pct * 10000)
    # excess = 0.0024 = 0.24% = 24 basis points
    # option 1 = 24 basis points
    return {"value": basis_points, "option_key": 1}

if __name__ == "__main__":
    print(solve())
