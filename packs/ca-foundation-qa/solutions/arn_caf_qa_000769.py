def solve():
    mean = 40
    sd = 10
    cv = (sd / mean) * 100  # 25.0
    # Options: 1=25%, 2=40%, 3=4%, 4=400%
    option_key = 1
    return {"value": cv, "option_key": option_key}

if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
