"""Executable solution for arn_caf_qa_000904.

Notes Rs 10 (a), Rs 20 (b), Rs 50 (c): a+b+c=20, 10a+20b+50c=500, b=2a.
Find c, the number of Rs 50 notes.
Options: 1=5  2=10  3=8  4=15
"""


def solve():
    # b = 2a ; a + b + c = 20 -> 3a + c = 20
    #          a + 2b + 5c = 50 (value/10) -> with b=2a: 5a + 5c = 50 -> a + c = 10
    # (3a + c) - (a + c) = 20 - 10 -> 2a = 10 -> a = 5
    a = (20 - 10) / 2
    c = 10 - a
    b = 2 * a
    # consistency checks
    assert a + b + c == 20
    assert 10 * a + 20 * b + 50 * c == 500
    return {"value": c, "option_key": 1}


if __name__ == "__main__":
    print(solve())
