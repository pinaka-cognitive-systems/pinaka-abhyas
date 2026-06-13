def solve():
    # Spearman rank correlation: r_s = 1 - 6*sum(d^2) / (n*(n^2-1))
    rank_a = [1, 2, 3, 4, 5]
    rank_b = [2, 3, 1, 5, 4]
    n = 5
    d = [ra - rb for ra, rb in zip(rank_a, rank_b)]  # [-1, -1, 2, -1, 1]
    sum_d2 = sum(di ** 2 for di in d)                # = 1+1+4+1+1 = 8
    r_s = 1 - 6 * sum_d2 / (n * (n ** 2 - 1))       # = 1 - 48/120 = 0.60
    return {"value": round(r_s, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
