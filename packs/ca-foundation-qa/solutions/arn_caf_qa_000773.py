def solve():
    A = 20   # origin shift
    h = 4    # scale factor
    mean_u = 5
    sd_u = 2

    # Recover original statistics: x = h*u + A
    mean_x = h * mean_u + A   # 4*5 + 20 = 40
    sd_x = h * sd_u           # 4*2 = 8 (origin shift does not affect SD)
    cv = (sd_x / mean_x) * 100  # (8/40)*100 = 20%

    # Options: 1=40%, 2=20%, 3=5%, 4=10%
    option_key = 2
    return {"value": cv, "option_key": option_key}

if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
