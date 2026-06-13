def solve():
    p_a = 0.4
    p_b = 0.3
    p_a_and_b = 0.12
    p_a_given_b = p_a_and_b / p_b  # 0.4
    # Options: 1=0.4, 2=0.3, 3=0.12, 4=0.52
    if abs(p_a_given_b - 0.4) < 1e-9:
        option_key = 1
    elif abs(p_a_given_b - 0.3) < 1e-9:
        option_key = 2
    elif abs(p_a_given_b - 0.12) < 1e-9:
        option_key = 3
    else:
        option_key = 4
    return {"value": round(p_a_given_b, 4), "option_key": option_key}

if __name__ == "__main__":
    print(solve())
