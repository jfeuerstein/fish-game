#!/bin/sh
# Run the Blender model builder with a Python that has bpy (Blender as a Python module):
#   python3 -m venv .blender && .blender/bin/pip install bpy
# Set BLENDER_PY to that Python if it lives elsewhere.
PY="${BLENDER_PY:-.blender/bin/python}"
exec "$PY" "$(dirname "$0")/make.py" "$@"
