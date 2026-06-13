def solve():
    # Property: measures atmospheric condition (True) vs does not (False)
    candidates = [
        {"key": 1, "name": "Thermometer", "measures_atmospheric": True},
        {"key": 2, "name": "Barometer", "measures_atmospheric": True},
        {"key": 3, "name": "Hygrometer", "measures_atmospheric": True},
        {"key": 4, "name": "Telescope", "measures_atmospheric": False}
    ]
    # Enumerate all assignments
    atmospheric = [c for c in candidates if c["measures_atmospheric"]]
    non_atmospheric = [c for c in candidates if not c["measures_atmospheric"]]
    assert len(non_atmospheric) == 1, "Expected exactly one non-atmospheric instrument"
    result = non_atmospheric[0]
    return {"value": result["name"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
