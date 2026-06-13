import math

def solve():
    # Grouped frequency distribution
    # Classes: 10-20, 20-30, 30-40, 40-50, 50-60
    midpoints = [15, 25, 35, 45, 55]
    frequencies = [1, 4, 17, 10, 8]
    N = sum(frequencies)   # 40
    A = 35                 # assumed mean
    h = 10                 # class width

    # Step 1: coded deviations
    d = [(m - A) / h for m in midpoints]   # [-2, -1, 0, 1, 2]

    # Step 2: fd and fd^2 columns
    fd_col = [frequencies[i] * d[i] for i in range(5)]
    fd2_col = [frequencies[i] * d[i] ** 2 for i in range(5)]

    sum_fd = sum(fd_col)    # 20
    sum_fd2 = sum(fd2_col)  # 50

    # Step 3: actual mean
    mean = A + h * (sum_fd / N)  # 35 + 10*(20/40) = 40

    # Step 4: variance (assumed-mean correction applied)
    var_term = sum_fd2 / N - (sum_fd / N) ** 2  # 1.25 - 0.25 = 1.0
    variance = h ** 2 * var_term                  # 100 * 1.0 = 100
    sd = math.sqrt(variance)                      # 10

    # Step 5: CV
    cv = (sd / mean) * 100  # 25%

    # Options: 1=25%, 2=33.33%, 3=27.95%, 4=2.5%
    option_key = 1
    return {"value": round(cv, 2), "option_key": option_key}

if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
