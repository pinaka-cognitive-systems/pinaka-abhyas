"""Executable solution for arn_caf_qa_000214.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

System:
  2a + 3b = 17   ... (1)
  a + b = 7      ... (2)
From (2): a = 7 - b
Substitute into (1): 2(7 - b) + 3b = 17 -> 14 + b = 17 -> b = 3, a = 4
Question: 2a + b = 8 + 3 = 11
Correct option: 4 (text "Rs 11").
"""


def solve():
    # Solve the system
    # 2a + 3b = 17, a + b = 7
    # a = 7 - b  =>  2(7-b) + 3b = 17  =>  14 + b = 17  =>  b = 3
    b = 17 - 14          # 3
    a = 7 - b            # 4
    result = 2 * a + b   # 11
    return {"value": result, "option_key": 4}


if __name__ == "__main__":
    print(solve())
