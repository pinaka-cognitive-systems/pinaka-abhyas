"""Executable solution for arn_caf_qa_000982.

Corrected SD after one wrong observation. n=40, wrong mean=50, wrong SD=10.
Entry recorded 70 was actually 40. SD to two decimals.
Options: 1=9.59  2=13.21  3=10.34  4=10.00
"""
import math


def solve():
    n = 40
    mean_w = 50
    sd_w = 10
    wrong_val = 70
    right_val = 40
    Sx = n * mean_w
    Sx2 = n * (sd_w ** 2 + mean_w ** 2)
    Sx_c = Sx - wrong_val + right_val
    Sx2_c = Sx2 - wrong_val ** 2 + right_val ** 2
    mean_c = Sx_c / n
    variance = Sx2_c / n - mean_c ** 2
    sd = math.sqrt(variance)
    return {"value": round(sd, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
