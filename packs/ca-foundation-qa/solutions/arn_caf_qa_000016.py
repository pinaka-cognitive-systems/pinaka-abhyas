"""Executable solution for arn_caf_qa_000016.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=TBM  2=RBL  3=UCK  4=SCM

Coding rule: shift letter at position i by i places forward (1-indexed).
  R(18)+1=S(19), A(1)+2=C(3), J(10)+3=M(13) -> SCM.
"""


def solve():
    word = "RAJ"
    coded = []
    for i, ch in enumerate(word, start=1):
        original_pos = ord(ch) - ord("A") + 1  # 1-indexed position in alphabet
        new_pos = original_pos + i
        coded.append(chr(ord("A") + new_pos - 1))

    result = "".join(coded)  # "SCM"
    assert result == "SCM"

    # option 4 = SCM
    option_key = 4
    return {"value": result, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
