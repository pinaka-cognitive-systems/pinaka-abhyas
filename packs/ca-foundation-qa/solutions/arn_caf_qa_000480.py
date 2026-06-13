def solve():
    # Three AP terms: (a-d), a, (a+d)
    # Sum = 3a = 21  =>  a = 7
    # Sum of squares = 3a^2 + 2d^2 = 155
    target_sum = 21
    target_sum_sq = 155
    a = target_sum / 3      # 7
    # 3a^2 + 2d^2 = 155
    d_sq = (target_sum_sq - 3 * a ** 2) / 2   # (155 - 147) / 2 = 4
    d = d_sq ** 0.5          # 2
    terms = [a - d, a, a + d]  # [5, 7, 9]
    product = int(terms[0] * terms[1] * terms[2])  # 315
    # options: 1->315, 2->343, 3->280, 4->336
    options = {1: 315, 2: 343, 3: 280, 4: 336}
    option_key = [k for k, v in options.items() if v == product][0]
    return {"value": product, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
