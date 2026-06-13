def solve():
    import math
    # JOURNAL: 7 letters, vowels O U A grouped together
    # Treat vowel block as 1 unit: 5 units in a row
    # 5! arrangements of units, 3! arrangements within vowel block
    value = math.factorial(5) * math.factorial(3)  # 120 * 6 = 720
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
