def solve():
    cost = 80000
    rate = 0.10
    years = 4
    annual_dep = cost * rate  # 8000
    book_value = cost - years * annual_dep  # 80000 - 32000 = 48000
    return {"value": book_value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
