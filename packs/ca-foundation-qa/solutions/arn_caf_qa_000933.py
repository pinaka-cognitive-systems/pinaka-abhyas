def solve():
    # Two missing frequencies from a given mean AND total; solve simultaneously.
    # Class marks 10, 30, 50, 70, 90 with frequencies 17, f1, 32, f2, 19.
    # Total N = 120, mean = 50. Find f1.
    # Equation A (total):  17 + f1 + 32 + f2 + 19 = 120  ->  f1 + f2 = 52.
    # Equation B (mean):   (17*10 + 30*f1 + 32*50 + 70*f2 + 19*90)/120 = 50.
    #   170 + 30*f1 + 1600 + 70*f2 + 1710 = 6000  ->  30*f1 + 70*f2 = 2520
    #   ->  3*f1 + 7*f2 = 252.
    # Substitute f1 = 52 - f2 into 3*f1 + 7*f2 = 252:
    #   3*(52 - f2) + 7*f2 = 252  ->  156 + 4*f2 = 252  ->  f2 = 24  ->  f1 = 28.
    known_marks = 17 * 10 + 32 * 50 + 19 * 90       # 3480
    known_freq = 17 + 32 + 19                        # 68
    N = 120
    mean = 50
    sum_missing_freq = N - known_freq                # f1 + f2 = 52
    # Total marks contributed by the two missing classes:
    sum_missing_marks = mean * N - known_marks       # 30*f1 + 70*f2 = 2520
    # 30*f1 + 70*f2 = 2520 and f1 + f2 = 52  ->  30*f1 + 70*(52 - f1) = 2520
    # 30*f1 + 3640 - 70*f1 = 2520  ->  -40*f1 = -1120  ->  f1 = 28.
    f1 = (70 * sum_missing_freq - sum_missing_marks) / (70 - 30)
    return {"value": int(round(f1)), "option_key": 4}


if __name__ == "__main__":
    print(solve())
