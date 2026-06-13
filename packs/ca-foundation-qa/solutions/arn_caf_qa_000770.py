def solve():
    cv_a = 20  # percent
    cv_b = 15  # percent
    # Lower CV = more consistent
    # Series B has lower CV
    # Options: 1=A higher CV (wrong direction), 2=B lower CV (correct), 3=A lower mean (wrong), 4=B lower SD (wrong claim)
    option_key = 2
    return {"value": cv_b, "option_key": option_key}

if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
