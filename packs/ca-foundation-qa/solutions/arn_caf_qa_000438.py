def solve():
    cost = 100000
    residual = 10000
    life = 5
    years = 3
    annual_dep = (cost - residual) / life  # 90000/5 = 18000
    book_value = cost - years * annual_dep  # 100000 - 54000 = 46000
    return {"value": book_value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
