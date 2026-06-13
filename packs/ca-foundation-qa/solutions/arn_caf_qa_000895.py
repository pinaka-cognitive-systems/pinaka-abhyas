def solve():
    # Time-reversal test: I01 x I10 = 1
    # Fisher's ideal index satisfies this by being the geometric mean of L and P.
    # Laspeyre's, Paasche's, and Drobisch do not.
    # Correct option: 3 (Fisher's ideal index)
    return {"value": "Fisher's ideal index", "option_key": 3}

if __name__ == "__main__":
    print(solve())
