"""Executable solution for arn_caf_qa_000152.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options (after shuffle): 1=2022  2=2021  3=2020  4=2023

Deflate each year: Real = (Nominal / Index) * 100.
Find the year with the highest real wage. Answer: 2022 = option 1.
"""


def solve():
    data = [
        (2020, 20_000, 100),
        (2021, 22_000, 110),
        (2022, 25_000, 120),
        (2023, 28_000, 140),
    ]
    real_wages = {yr: (nom / idx) * 100 for yr, nom, idx in data}
    # 2020=20000, 2021=20000, 2022=20833.33, 2023=20000 -> highest is 2022
    best_real = real_wages[2022]

    option_key = 1
    return {"value": best_real, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
