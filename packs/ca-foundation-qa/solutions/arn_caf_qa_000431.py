def solve():
    principal = 50000
    rate = 0.12
    time_years = 1
    n_instalments = 12
    total_interest = principal * rate * time_years
    total_repayable = principal + total_interest
    emi = total_repayable / n_instalments
    # emi = 4666.67, rounds to 4667 -> option 1
    return {"value": round(emi), "option_key": 1}

if __name__ == "__main__":
    print(solve())
