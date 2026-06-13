"""Executable solution for arn_caf_qa_000936.

Bayes theorem: invert forward defect rates to the posterior P(B|D).
Options: 1=12/37  2=0.04  3=0.30  4=12/100
"""

from fractions import Fraction


def solve():
    # Priors (output shares) and forward defect rates per machine.
    prior = {"A": Fraction(50, 100), "B": Fraction(30, 100), "C": Fraction(20, 100)}
    rate = {"A": Fraction(3, 100), "B": Fraction(4, 100), "C": Fraction(5, 100)}

    # Law of total probability: total defective probability.
    p_d = sum(prior[m] * rate[m] for m in prior)  # 0.037 = 37/1000

    # Joint for B, then Bayes posterior P(B|D).
    joint_b = prior["B"] * rate["B"]  # 12/1000
    posterior_b = joint_b / p_d  # 12/37

    value = float(posterior_b)  # ~0.324
    option_key = 1  # 12/37
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
