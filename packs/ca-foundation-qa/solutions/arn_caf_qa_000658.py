def solve():
    # Only son of Mohan's father = Mohan (self-reference)
    # Lata's father = Mohan => Mohan is Lata's father
    # Father = option 1
    return {"value": "Father", "option_key": 1}

if __name__ == "__main__":
    print(solve())
