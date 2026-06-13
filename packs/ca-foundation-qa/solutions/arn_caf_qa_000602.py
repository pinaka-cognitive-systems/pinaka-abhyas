def solve():
    # Priya walks 6 km East then 8 km North.
    # East and North are perpendicular.
    east = 6
    north = 8
    distance = (east**2 + north**2) ** 0.5
    # distance = sqrt(36 + 64) = sqrt(100) = 10
    assert abs(distance - 10.0) < 1e-9
    return {"value": distance, "option_key": 1}

if __name__ == "__main__":
    print(solve())
