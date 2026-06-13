def solve():
    # Categories: fruit=True, vegetable=False
    candidates = [
        {"key": 1, "name": "Mango", "is_fruit": True},
        {"key": 2, "name": "Apple", "is_fruit": True},
        {"key": 3, "name": "Carrot", "is_fruit": False},
        {"key": 4, "name": "Orange", "is_fruit": True}
    ]
    # Enumerate: majority property is fruit; odd one out is not a fruit
    fruits = [c for c in candidates if c["is_fruit"]]
    vegetables = [c for c in candidates if not c["is_fruit"]]
    assert len(vegetables) == 1, "Expected exactly one non-fruit"
    result = vegetables[0]
    return {"value": result["name"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
