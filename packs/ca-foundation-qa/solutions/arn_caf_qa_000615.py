import json
def solve():
    # Directions in degrees clockwise from North
    direction_degrees = {
        "North": 0, "North-East": 45, "East": 90, "South-East": 135,
        "South": 180, "South-West": 225, "West": 270, "North-West": 315
    }
    degrees_direction = {v: k for k, v in direction_degrees.items()}

    start = "South-West"
    start_deg = direction_degrees[start]
    rotation = 135  # clockwise
    final_deg = (start_deg + rotation) % 360
    final_dir = degrees_direction[final_deg]

    option_map = {"North": 1, "North-East": 2, "East": 3, "South-East": 4}
    option_key = option_map[final_dir]
    return {"value": final_deg, "option_key": option_key}

if __name__ == "__main__":
    print(json.dumps(solve()))
