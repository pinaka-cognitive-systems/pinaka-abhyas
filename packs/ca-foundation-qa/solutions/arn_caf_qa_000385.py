def solve():
    # Debenture: nominal 10% compounded half-yearly
    # EAR = (1 + 0.10/2)^2 - 1 = (1.05)^2 - 1 = 1.1025 - 1 = 0.1025 = 10.25%
    # Bond: 10.25% compounded annually => EAR = 10.25%
    ear_debenture = 1.1025 - 1  # = 0.1025
    ear_bond = 0.1025
    # Both equal 10.25%, so option 1: yields are exactly equal
    assert abs(ear_debenture - ear_bond) < 1e-9
    return {"value": round(ear_debenture * 100, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
