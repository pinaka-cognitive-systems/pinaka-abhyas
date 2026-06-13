def solve():
    mean_x = 12
    sd_x = 0.6
    mean_y = 20
    sd_y = 0.8

    cv_x = (sd_x / mean_x) * 100  # 5.0%
    cv_y = (sd_y / mean_y) * 100  # 4.0%

    # Lower CV = more consistent => Machine Y
    # Difference = cv_x - cv_y = 1.0%
    diff = cv_x - cv_y  # 1.0
    # Options: 1=X diff 1%, 2=Y diff 1%, 3=X diff 2%, 4=Y diff 2%
    option_key = 2
    return {"value": diff, "option_key": option_key}

if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
