def solve():
    # Reconstruct the frequency distribution from a "less than" cumulative table,
    # then compute the mean.
    upper = [10, 20, 30, 40, 50, 60]
    ltcf = [4, 16, 40, 76, 96, 100]   # "less than" cumulative frequencies
    # Class frequencies = successive differences of the cumulative figures.
    freqs = [ltcf[0]] + [ltcf[i] - ltcf[i - 1] for i in range(1, len(ltcf))]
    # Class marks (midpoints) of 0-10, 10-20, ..., 50-60.
    mids = [5, 15, 25, 35, 45, 55]
    N = sum(freqs)
    mean = sum(f * x for f, x in zip(freqs, mids)) / N
    return {"value": round(mean, 2), "option_key": 2}


if __name__ == "__main__":
    print(solve())
