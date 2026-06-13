"""Executable solution for arn_caf_qa_000943.

Deflate a multi-year nominal income series to real values and find the trough.
Options: 1=2023  2=2021  3=2024  4=2022
"""


def solve():
    # year -> (money_income, price_index)
    data = {
        2021: (24000, 100),
        2022: (27000, 120),
        2023: (33000, 150),
        2024: (39000, 160),
    }

    # Real income = money income / price index * 100.
    real = {year: income / index * 100 for year, (income, index) in data.items()}
    # {2021:24000, 2022:22500, 2023:22000, 2024:24375}

    lowest_year = min(real, key=real.get)  # 2023

    option_for_year = {2023: 1, 2021: 2, 2024: 3, 2022: 4}
    value = lowest_year  # 2023
    option_key = option_for_year[lowest_year]  # 1
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
