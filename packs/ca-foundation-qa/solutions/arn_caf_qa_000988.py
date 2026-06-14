"""Executable solution for arn_caf_qa_000988.

Three machines A,B,C with shares 0.30,0.30,0.40 and defect rates 0.05,0.04,0.02.
A bolt is defective; find P(A | defective) via Bayes.
Options: 1=0.429  2=0.300  3=0.050  4=0.015
"""


def solve():
    shares = [0.30, 0.30, 0.40]
    defect = [0.05, 0.04, 0.02]
    joint = [s * d for s, d in zip(shares, defect)]   # 0.015, 0.012, 0.008
    evidence = sum(joint)                              # 0.035
    posterior_a = joint[0] / evidence                  # 0.4286
    value = round(posterior_a, 3)                       # 0.429
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
