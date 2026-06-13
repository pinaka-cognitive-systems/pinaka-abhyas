def solve():
    # log_a(b) = 3/2, log_a(c) = 2
    # Find log_a(b^2 / c) = 2*log_a(b) - log_a(c)
    log_a_b = 3 / 2
    log_a_c = 2
    result = 2 * log_a_b - log_a_c  # 3 - 2 = 1
    result_int = int(result)
    # options: 1->1, 2->3, 3->5, 4->0
    option_map = {1: 1, 3: 2, 5: 3, 0: 4}
    option_key = option_map[result_int]
    return {"value": result_int, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
