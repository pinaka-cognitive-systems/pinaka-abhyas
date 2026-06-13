def solve():
    cost = 400000
    rate = 0.15
    n = 4
    factor = 0.5220  # given (0.85)^4
    book_value = cost * factor  # 208800
    total_dep = cost - book_value  # 191200
    return {"value": total_dep, "option_key": 1}

if __name__ == "__main__":
    print(solve())
