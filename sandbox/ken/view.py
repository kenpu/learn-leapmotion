import json
import sys

filename = sys.argv[1]

with open(filename, "r") as f:
    data = json.load(f)

normal = [x['palmNormal'] for x in data]
print normal
