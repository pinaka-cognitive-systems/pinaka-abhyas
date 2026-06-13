def solve():
    # Odd man out by category: tools used in cooking
    # Ladle, Whisk, Spatula, Hammer
    # Ladle, Whisk, Spatula are kitchen/cooking tools; Hammer is a carpentry tool
    # Options: 1->Ladle, 2->Whisk, 3->Hammer, 4->Spatula
    # Hammer is the odd one out -> option 3
    items = {1: "Ladle", 2: "Whisk", 3: "Hammer", 4: "Spatula"}
    cooking_tools = {"Ladle", "Whisk", "Spatula"}
    odd = [k for k, v in items.items() if v not in cooking_tools]
    assert odd == [3], f"Got {odd}"
    return {"value": "Hammer", "option_key": 3}

if __name__ == "__main__":
    print(solve())
