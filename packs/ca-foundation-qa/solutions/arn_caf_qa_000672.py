def solve():
    # Frequency distribution: [0-10]: f1, [10-20]: 14, [20-30]: 22, [30-40]: 10, [40-50]: f5
    # N=70, mean=21; class midpoints: 5, 15, 25, 35, 45

    N = 70
    mean = 21
    midpoints = [5, 15, 25, 35, 45]
    known_freqs = [None, 14, 22, 10, None]  # f1 and f5 unknown

    # Step 1: f1 + f5 = N - sum of known frequencies
    known_sum = 14 + 22 + 10  # = 46
    f1_plus_f5 = N - known_sum  # = 24

    # Step 2: total sum of fx = mean * N
    total_fx = mean * N  # = 1470

    # Step 3: known sum of fx
    known_fx = 14 * 15 + 22 * 25 + 10 * 35  # = 210 + 550 + 350 = 1110

    # Step 4: unknown sum of fx = 5*f1 + 45*f5 = total_fx - known_fx
    unknown_fx = total_fx - known_fx  # = 360

    # Step 5: solve system
    # f1 + f5 = 24     ...(i)
    # 5*f1 + 45*f5 = 360  ...(ii)
    # Subtract 5*(i) from (ii): 40*f5 = 360 - 120 = 240; f5 = 6
    f5 = (unknown_fx - 5 * f1_plus_f5) / (45 - 5)  # = 240/40 = 6
    f1 = f1_plus_f5 - f5  # = 18

    assert f1 == 18, f"Expected f1=18, got {f1}"
    assert f5 == 6, f"Expected f5=6, got {f5}"

    # Verify mean
    all_freqs = [f1, 14, 22, 10, f5]
    computed_fx = sum(f * m for f, m in zip(all_freqs, midpoints))
    computed_mean = computed_fx / sum(all_freqs)
    assert computed_mean == 21.0, f"Mean check failed: {computed_mean}"

    return {"value": int(f1), "option_key": 1}

if __name__ == "__main__":
    print(solve())
