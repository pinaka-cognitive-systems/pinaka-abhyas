import json
def solve():
    # Ravi starts facing North
    # Directions in clockwise order: N=0, E=1, S=2, W=3
    facing = 0  # North
    # Turn 90 degrees clockwise
    facing = (facing + 1) % 4
    # Walk 5 km (doesn't affect direction)
    # Turn 90 degrees clockwise again
    facing = (facing + 1) % 4
    # Walk 3 km (doesn't affect direction)
    direction_names = {0: "North", 1: "East", 2: "South", 3: "West"}
    # South = option key 1
    option_map = {"South": 1, "East": 2, "West": 3, "North": 4}
    final_direction = direction_names[facing]
    option_key = option_map[final_direction]
    return {"value": facing, "option_key": option_key}

if __name__ == "__main__":
    print(json.dumps(solve()))
