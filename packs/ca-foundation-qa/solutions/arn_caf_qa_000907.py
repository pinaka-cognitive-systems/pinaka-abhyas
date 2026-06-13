"""Executable solution for arn_caf_qa_000907.

Rs 16000, 2 years, compounded at 5% (year 1) then 15% (year 2). Find amount.
Options: 1=19320  2=19360  3=19200  4=21160
"""


def solve():
    p = 16000
    amount = p * (1 + 5 / 100) * (1 + 15 / 100)
    return {"value": round(amount), "option_key": 1}


if __name__ == "__main__":
    print(solve())
