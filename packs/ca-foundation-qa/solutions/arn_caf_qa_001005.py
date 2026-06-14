"""Executable solution for arn_caf_qa_001005.

Deflate money wages by CPI; find the year of lowest real wage.
real = nominal / CPI * 100. Returns the trough year.
Options: 1=2022  2=2023  3=2019  4=2021
"""

YEARS = [2019, 2020, 2021, 2022, 2023]
WAGE = [24000, 26000, 28000, 31000, 33000]
CPI = [100, 110, 125, 145, 150]


def solve():
    real = [w / c * 100 for w, c in zip(WAGE, CPI)]
    i_min = real.index(min(real))
    trough_year = YEARS[i_min]
    # map trough year to option key
    year_to_key = {2022: 1, 2023: 2, 2019: 3, 2021: 4}
    return {"value": trough_year, "option_key": year_to_key[trough_year]}


if __name__ == "__main__":
    print(solve())
