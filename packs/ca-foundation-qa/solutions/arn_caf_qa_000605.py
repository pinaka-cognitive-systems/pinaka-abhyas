def solve():
    # Suresh walks 5 km North then 12 km East.
    # North and East are perpendicular; use Pythagoras.
    north = 5
    east = 12
    distance = (north**2 + east**2) ** 0.5
    # 5-12-13 triple
    assert abs(distance - 13.0) < 1e-9
    return {"value": distance, "option_key": 1}

if __name__ == "__main__":
    print(solve())
