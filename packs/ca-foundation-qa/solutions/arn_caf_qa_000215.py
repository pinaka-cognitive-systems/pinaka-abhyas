"""Executable solution for arn_caf_qa_000215.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

P = 15000, annual rate = 8%, compounded quarterly, n = 2 years.
Periodic rate = 8/4 = 2% = 0.02, periods = 4*2 = 8.
Hint given in stem: (1.02)^8 = 1.1717
A = 15000 * 1.1717 = 17575.50
CI = A - P = 17575.50 - 15000 = 2575.50
Correct option: 1 (text "Rs 2575.50").
"""


def solve():
    principal = 15000
    hint_power = 1.1717          # (1.02)^8 as given in stem
    amount = principal * hint_power   # 17575.50
    ci = round(amount - principal, 2) # 2575.50
    return {"value": ci, "option_key": 1}


if __name__ == "__main__":
    print(solve())
