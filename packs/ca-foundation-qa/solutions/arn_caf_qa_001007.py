"""Executable solution for arn_caf_qa_001007.

Index has a base change. Splice via the overlap year (2020 = 150 on old base,
100 on new base, factor 1.5), then deflate 2021 income.
Options: 1=35151.52  2=52727.27  3=79090.91  4=95700.00
"""


def solve():
    cpi_2020_oldbase = 150     # 2020 on base 2018 = 100
    cpi_2020_newbase = 100     # 2020 on the re-based series
    splice_factor = cpi_2020_oldbase / cpi_2020_newbase   # 1.5

    cpi_2021_newbase = 110
    cpi_2021_spliced = cpi_2021_newbase * splice_factor   # 165 on base 2018

    income_2021 = 58000
    real_2021 = income_2021 / cpi_2021_spliced * 100      # 35151.52
    return {"value": round(real_2021, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
