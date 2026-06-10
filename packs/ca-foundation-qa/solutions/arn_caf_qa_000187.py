"""Executable solution for arn_caf_qa_000187.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=HTDTJ  2=ITCRH  3=ITCRG  4=HSBQF

Coding puzzle: letter-shift cipher.
  Given: MANGO -> OCPIQ.
  Rule: each letter shifts forward by 2 positions in the alphabet (A=1, Z=26, wraps).
  Question: what is the code for GRAPE?
"""

OPTION_MAP = {"HTDTJ": 1, "ITCRH": 2, "ITCRG": 3, "HSBQF": 4}
GIVEN_PLAINTEXT = "MANGO"
GIVEN_CIPHERTEXT = "OCPIQ"
TARGET_WORD = "GRAPE"
KEYED_ANSWER = "ITCRG"
option_key = 3


def _infer_shift(plain: str, cipher: str) -> int:
    """Infer the consistent shift from plain to cipher.

    Raises AssertionError if shifts are not all equal.
    """
    shifts = []
    for p, c in zip(plain, cipher):
        shift = (ord(c) - ord(p)) % 26
        shifts.append(shift)
    assert len(set(shifts)) == 1, f"Shifts are not uniform: {shifts}"
    return shifts[0]


def _apply_shift(word: str, shift: int) -> str:
    """Apply a fixed shift to every letter of word."""
    result = []
    for ch in word:
        new_ch = chr((ord(ch) - ord('A') + shift) % 26 + ord('A'))
        result.append(new_ch)
    return "".join(result)


def solve():
    shift = _infer_shift(GIVEN_PLAINTEXT, GIVEN_CIPHERTEXT)
    code = _apply_shift(TARGET_WORD, shift)
    assert code == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {code}"
    return {"value": code, "option_key": option_key}


def check_consistency():
    """Enumerate candidate shifts and confirm satisfiability and uniqueness.

    satisfiable: a consistent shift exists for the given example.
    unique: applying that shift to GRAPE yields exactly one code matching the keyed answer.
    """
    try:
        shift = _infer_shift(GIVEN_PLAINTEXT, GIVEN_CIPHERTEXT)
        satisfiable = True
    except AssertionError:
        return {"satisfiable": False, "unique": False}

    code = _apply_shift(TARGET_WORD, shift)
    unique = code == KEYED_ANSWER
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
