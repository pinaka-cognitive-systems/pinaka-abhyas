"""Executable solution for arn_caf_qa_000989.

Suppliers P,Q,R shares 0.50,0.30,0.20. Q defect 4%; P = half of Q = 2%; R = 3x Q = 12%.
Phone works; find P(R | works).
Options: 1=0.184  2=0.200  3=0.522  4=0.176
"""


def solve():
    shares = [0.50, 0.30, 0.20]
    q_defect = 0.04
    defect = [q_defect / 2, q_defect, q_defect * 3]   # 0.02, 0.04, 0.12
    works = [1 - d for d in defect]                    # 0.98, 0.96, 0.88
    joint = [s * w for s, w in zip(shares, works)]     # 0.49, 0.288, 0.176
    evidence = sum(joint)                              # 0.954
    posterior_r = joint[2] / evidence                  # 0.184
    value = round(posterior_r, 3)
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
