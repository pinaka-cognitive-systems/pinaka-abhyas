import math

def solve():
    # Given: L01=150, P01=96, L10=80 (reverse Laspeyre, a decoy)
    # Step 1: Fisher forward F01 = sqrt(L01 * P01)
    L01 = 150
    P01 = 96
    F01 = math.sqrt(L01 * P01)  # = sqrt(14400) = 120.0 exactly

    # Step 2: Time-reversal test for Fisher: F01 * F10 = 10000 (index form)
    F10 = 10000 / F01  # = 10000/120 = 83.33...

    # Verify: F01 * F10 = 120 * 83.33 = 10000 (exactly)
    assert abs(F01 * F10 - 10000) < 1e-9

    F10_rounded = round(F10)  # 83

    # Verify L10 is irrelevant: L01 * L10 / 100 = 150*80/100 = 120 != 100 -> Laspeyre fails time-reversal
    L10 = 80
    L_product = L01 * L10 / 100  # = 120, not 100 -> confirms Laspeyre's fails

    # Option mapping: 1=67 (10000/150), 2=80 (L10 decoy), 3=83 (Fisher reverse), 4=104 (10000/96)
    assert F10_rounded == 83
    return {"value": round(F10, 2), "option_key": 3}

if __name__ == "__main__":
    print(solve())
