def solve():
    cost = 500000
    rate = 0.20
    years = 3
    factor = 0.512  # given (0.8)^3
    book_value = cost * factor  # 500000 * 0.512 = 256000
    return {"value": book_value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
