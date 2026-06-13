def solve():
    # Disease prevalence P(D) = 0.1
    # Sensitivity P(+|D) = 0.9
    # Specificity P(-|H) = 0.8, so P(+|H) = 0.2
    p_D = 0.1
    p_H = 0.9
    p_pos_given_D = 0.9
    p_pos_given_H = 1 - 0.8  # = 0.2
    p_pos = p_pos_given_D * p_D + p_pos_given_H * p_H
    p_D_given_pos = (p_pos_given_D * p_D) / p_pos
    # = 0.09 / 0.27 = 1/3 = 0.3333...
    # options: 1->0.333, 2->0.900, 3->0.450, 4->0.111
    options = {1: 0.333, 2: 0.900, 3: 0.450, 4: 0.111}
    opt_key = min(options, key=lambda k: abs(options[k] - p_D_given_pos))
    return {"value": round(p_D_given_pos, 4), "option_key": opt_key}

if __name__ == "__main__":
    print(solve())
