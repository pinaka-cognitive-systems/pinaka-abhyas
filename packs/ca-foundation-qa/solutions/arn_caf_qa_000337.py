def solve():
    # Let sister's age = s, Priya = 2s + 4
    # s + 2s + 4 = 31 => 3s = 27 => s = 9
    # Priya = 2*9 + 4 = 22
    s = (31 - 4) / 3
    priya = 2 * s + 4
    return {"value": priya, "option_key": 2}

if __name__ == "__main__":
    print(solve())
