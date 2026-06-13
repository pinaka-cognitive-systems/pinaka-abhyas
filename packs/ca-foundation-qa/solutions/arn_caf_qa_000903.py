"""Executable solution for arn_caf_qa_000903.

Coins Rs 1, Rs 2, Rs 5 in count ratio 3:4:2, total value Rs 420.
Find the number of Rs 2 coins.
Options: 1=80  2=40  3=20  4=60
"""


def solve():
    # counts: 3x, 4x, 2x ; value 1*3x + 2*4x + 5*2x = 21x = 420
    total_value = 420
    x = total_value / (3 * 1 + 4 * 2 + 2 * 5)  # 21x = 420 -> x = 20
    rs2_coins = 4 * x
    return {"value": rs2_coins, "option_key": 1}


if __name__ == "__main__":
    print(solve())
