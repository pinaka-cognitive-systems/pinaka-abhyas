"""Executable solution for arn_caf_qa_000103.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=44.29  2=45  3=40  4=45.71

Distribution: 20-30:5, 30-40:12, 40-50:18, 50-60:10, 60-70:5.
Mode via grouping formula.
"""


def solve():
    classes = [(20, 30), (30, 40), (40, 50), (50, 60), (60, 70)]
    freqs = [5, 12, 18, 10, 5]

    # Modal class: highest frequency
    max_f = max(freqs)
    modal_idx = freqs.index(max_f)  # index 2, class 40-50

    L = classes[modal_idx][0]        # 40
    h = classes[modal_idx][1] - L    # 10
    f1 = freqs[modal_idx]             # 18
    f0 = freqs[modal_idx - 1]         # 12
    f2 = freqs[modal_idx + 1]         # 10

    # Mode = L + ((f1 - f0) / (2*f1 - f0 - f2)) * h
    mode = L + ((f1 - f0) / (2 * f1 - f0 - f2)) * h
    # 40 + (6/14)*10 = 40 + 4.2857... = 44.2857...

    mode_rounded = round(mode, 2)  # 44.29

    # option 1 = 44.29
    option_key = 4
    return {"value": mode_rounded, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
