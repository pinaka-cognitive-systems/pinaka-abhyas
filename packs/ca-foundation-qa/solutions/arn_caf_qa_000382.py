def solve():
    # Option A: 12% nominal, quarterly compounding
    r_A_nominal = 12
    m_A = 4
    EAR_A = (1 + r_A_nominal / (100 * m_A)) ** m_A - 1  # (1.03)^4 - 1
    EAR_A_pct = round(EAR_A * 100, 4)  # 12.5509...%, using given hint = 12.55%

    # Option B: 12.36% annual compounding
    EAR_B_pct = 12.36

    # Option B is cheaper (lower EAR for borrower)
    # EAR_A_pct > EAR_B_pct => Option B is cheaper
    # Option 1: "Option B is cheaper; Option A EAR = 12.55%"
    assert EAR_A_pct > EAR_B_pct, f"Check failed: {EAR_A_pct} vs {EAR_B_pct}"
    return {"value": round(EAR_A_pct, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
