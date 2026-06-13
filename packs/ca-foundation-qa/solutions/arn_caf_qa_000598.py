def solve():
    # Property: string instrument (True) vs percussion (False)
    candidates = [
        {"key": 1, "name": "Violin", "is_string": True},
        {"key": 2, "name": "Sitar", "is_string": True},
        {"key": 3, "name": "Tabla", "is_string": False},
        {"key": 4, "name": "Cello", "is_string": True}
    ]
    strings = [c for c in candidates if c["is_string"]]
    non_strings = [c for c in candidates if not c["is_string"]]
    assert len(non_strings) == 1, "Expected exactly one non-string instrument"
    result = non_strings[0]
    return {"value": result["name"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
