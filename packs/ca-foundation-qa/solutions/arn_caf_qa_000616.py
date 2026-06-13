import json
def solve():
    # Directions clockwise: N=0, E=1, S=2, W=3
    # Right turn = clockwise = +1 mod 4
    facing = 3  # West
    # Turn right (clockwise)
    facing = (facing + 1) % 4  # 3+1=4 mod 4 = 0 = North
    direction_names = {0: "North", 1: "East", 2: "South", 3: "West"}
    option_map = {"South": 1, "North": 2, "East": 3, "West": 4}
    final_direction = direction_names[facing]
    option_key = option_map[final_direction]
    return {"value": facing, "option_key": option_key}

if __name__ == "__main__":
    print(json.dumps(solve()))
