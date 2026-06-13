def solve():
    red, blue, green = 4, 3, 5
    total = red + blue + green  # 12
    prob_blue = blue / total    # 3/12 = 1/4
    # Options: 1->1/4, 2->1/3, 3->3/12(=1/4 trap), 4->5/12
    # Correct simplified form is 1/4, option_key 1
    return {"value": prob_blue, "option_key": 1}

if __name__ == "__main__":
    print(solve())
