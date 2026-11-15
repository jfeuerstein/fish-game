"""Build the models fal did not make, in Blender, as GLB files in art/models/ (tools/assets/lofi.mjs then cuts them down for the game).

    tools/blender/run.sh [id ...]

Each is one mesh coloured per face and flat shaded. index.json records them with
`source: "blender"`, so tools/assets/make-models.mjs knows it may replace them with generated
ones when fal can be used again.
"""
import json

import bpy  # noqa: F401  (loads mathutils and bmesh)
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from fish import FISH  # noqa: E402
from lib import Model, R, S, T, clean, hexrgb  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'art', 'models')


# --- Hats: Z up, brim at z = 0, about a unit across ----------------------------------

def hat_bucket(m):
    m.cone('#6f9a4a', matrix=T(0, 0, 0.32), seg=12, r1=0.42, r2=0.34, depth=0.5)
    m.cone('#5f8a3e', matrix=T(0, 0, 0.06), seg=12, r1=0.62, r2=0.42, depth=0.12)
    m.cylinder('#4f7a34', matrix=T(0, 0, 0.13), seg=12, r=0.425, depth=0.06)


def hat_straw(m):
    straw = lambda c: hexrgb('#e9cf8a') if (math.floor(c.x * 14 + c.y * 14) % 2) else hexrgb('#dcbf72')
    m.cylinder(straw, matrix=T(0, 0, 0.03), seg=16, r=0.75, depth=0.05)
    m.cone(straw, matrix=T(0, 0, 0.22), seg=14, r1=0.38, r2=0.32, depth=0.36)
    m.cylinder('#d8453c', matrix=T(0, 0, 0.1), seg=14, r=0.385, depth=0.09)


def hat_beanie(m):
    m.sphere('#f2c23a', deform=lambda p: (p[0] * 0.42, p[1] * 0.42, max(p[2], 0) * 0.48), seg=12, rings=8, matrix=T(0, 0, 0.05))
    m.cylinder('#e2ac24', matrix=T(0, 0, 0.08), seg=12, r=0.44, depth=0.16)
    m.sphere('#fff4d6', matrix=T(0, 0, 0.58), r=0.14, seg=8, rings=6)


def hat_captain(m):
    m.cylinder('#ffffff', matrix=T(0, 0, 0.25), seg=14, r=0.42, depth=0.22, deform=lambda p: (p[0] * (1.1 if p[2] > 0 else 1), p[1] * (1.1 if p[2] > 0 else 1), p[2]))
    m.cylinder('#222831', matrix=T(0, 0, 0.09), seg=14, r=0.4, depth=0.12)
    m.cylinder('#222831', matrix=T(0.3, 0, 0.04) @ S(0.8, 1, 1), seg=12, r=0.33, depth=0.03, deform=lambda p: (max(p[0], -0.05), p[1], p[2]))
    m.sphere('#e3b03f', matrix=T(0.42, 0, 0.22) @ S(0.04, 0.08, 0.06), seg=6, rings=4)


def hat_flowers(m):
    m.torus('#5f9a4a', R=0.42, r=0.05, seg=16, tube=5)
    colours = ['#f08aa8', '#ffffff', '#f6d04a', '#c26ad6']
    for i in range(10):
        a = i / 10 * math.pi * 2
        c = colours[i % 4]
        x, y = math.cos(a) * 0.42, math.sin(a) * 0.42
        for k in range(5):
            b = k / 5 * math.pi * 2
            m.sphere(c, matrix=T(x + math.cos(b) * 0.06, y + math.sin(b) * 0.06, 0.06) @ S(0.05, 0.05, 0.025), seg=6, rings=4)
        m.sphere('#f6b23a', matrix=T(x, y, 0.08), r=0.035, seg=6, rings=4)


def hat_frog(m):
    m.sphere('#6fbf5a', deform=lambda p: (p[0] * 0.45, p[1] * 0.45, max(p[2], 0) * 0.42), seg=12, rings=8)
    for side in (-1, 1):
        m.sphere('#6fbf5a', matrix=T(0.16, side * 0.18, 0.4), r=0.13, seg=8, rings=6)
        m.sphere('#ffffff', matrix=T(0.24, side * 0.18, 0.43), r=0.08, seg=8, rings=5)
        m.sphere('#1b1d22', matrix=T(0.3, side * 0.18, 0.44), r=0.045, seg=6, rings=4)
    m.cylinder('#d9534a', matrix=T(0.38, 0, 0.12) @ R('Y', 80) @ S(1, 2.2, 1), seg=8, r=0.06, depth=0.04)


def hat_pirate(m):
    m.sphere('#24242c', deform=lambda p: (p[0] * 0.38, p[1] * 0.38, max(p[2], 0) * 0.32), seg=12, rings=7)
    for k in range(3):
        a = k / 3 * math.pi * 2
        m.box('#24242c', matrix=R('Z', math.degrees(a)) @ T(0.42, 0, 0.18) @ R('Y', -35), size=(0.12, 0.8, 0.34))
        m.box('#d7a93a', matrix=R('Z', math.degrees(a)) @ T(0.46, 0, 0.37) @ R('Y', -35), size=(0.04, 0.82, 0.04))
    m.sphere('#f3f0e6', matrix=T(0.47, 0, 0.18) @ S(0.03, 0.08, 0.08), seg=6, rings=4)


def hat_top(m):
    m.cylinder('#20232a', matrix=T(0, 0, 0.42), seg=14, r=0.34, depth=0.78)
    m.cylinder('#20232a', matrix=T(0, 0, 0.03), seg=16, r=0.56, depth=0.05)
    m.cylinder('#c9403a', matrix=T(0, 0, 0.14), seg=14, r=0.345, depth=0.12)


def hat_propeller(m):
    m.sphere(lambda c: hexrgb(['#d9453c', '#f2c23a', '#3a78c9'][int((math.atan2(c.y, c.x) + math.pi) / (2 * math.pi) * 6) % 3]), deform=lambda p: (p[0] * 0.43, p[1] * 0.43, max(p[2], 0) * 0.4), seg=12, rings=8)
    m.cylinder('#d9453c', matrix=T(0.3, 0, 0.03) @ S(0.8, 1, 1), seg=10, r=0.3, depth=0.03, deform=lambda p: (max(p[0], -0.05), p[1], p[2]))
    m.cylinder('#9aa3ad', matrix=T(0, 0, 0.5), seg=6, r=0.025, depth=0.2)
    for s in (-1, 1):
        m.box('#d9453c', matrix=T(0, s * 0.22, 0.6) @ R('X', s * 12), size=(0.12, 0.4, 0.025))


def hat_cowboy(m):
    tan = '#c9945a'
    m.cylinder(tan, matrix=T(0, 0, 0.04), seg=16, r=0.72, depth=0.05, deform=lambda p: (p[0], p[1], p[2] + 0.18 * (abs(p[1]) / 0.72) ** 2))
    m.sphere(tan, deform=lambda p: (p[0] * 0.38, p[1] * 0.33, max(p[2], 0) * 0.42 - (0.06 if p[2] > 0.7 and abs(p[1]) < 0.3 else 0)), seg=12, rings=8)
    m.cylinder('#6f4a2a', matrix=T(0, 0, 0.1), seg=14, r=0.375, depth=0.08, deform=lambda p: (p[0], p[1] * 0.87, p[2]))


def hat_crown(m):
    gold = '#ecbf3a'
    m.cylinder(gold, matrix=T(0, 0, 0.12), seg=16, r=0.38, depth=0.24, deform=lambda p: (p[0], p[1], p[2]))
    for i in range(8):
        a = i / 8 * math.pi * 2
        m.cone(gold, matrix=T(math.cos(a) * 0.36, math.sin(a) * 0.36, 0.33), seg=4, r1=0.08, r2=0, depth=0.2)
        m.sphere('#d9453c' if i % 2 else '#3a78c9', matrix=T(math.cos(a) * 0.39, math.sin(a) * 0.39, 0.12), r=0.045, seg=6, rings=4)


def hat_mushroom(m):
    m.sphere(lambda c: hexrgb('#ffffff') if (math.sin(c.x * 22) * math.sin(c.y * 22) > 0.6 and c.z > 0.15) else hexrgb('#d9453c'), deform=lambda p: (p[0] * 0.58, p[1] * 0.58, max(p[2], -0.1) * 0.42), seg=14, rings=8, matrix=T(0, 0, 0.08))
    m.cylinder('#f3ead6', matrix=T(0, 0, 0.04), seg=14, r=0.5, depth=0.06)


def hat_fish(m):
    from fish import fish_body

    sub = Model()
    sub.bm, sub.col = m.bm, m.col
    verts_before = set(m.bm.verts)
    fish_body(m, dict(back='#f08a3a', belly='#f6c27a', h=0.36, w=0.24, fin='#e2733a'), L=1.0)
    for v in m.bm.verts:
        if v not in verts_before:
            v.co = (T(0, 0, 0.18) @ S(0.85)) @ v.co


def hat_sailor(m):
    m.cylinder('#ffffff', matrix=T(0, 0, 0.17), seg=14, r=0.38, depth=0.3)
    m.cone('#ffffff', matrix=T(0, 0, 0.06), seg=14, r1=0.4, r2=0.5, depth=0.14)
    m.cylinder('#2f5fa8', matrix=T(0, 0, 0.18), seg=14, r=0.385, depth=0.06)


def hat_viking(m):
    m.sphere(lambda c: hexrgb('#b9c2cc') if c.z > 0.08 else hexrgb('#8a6a3a'), deform=lambda p: (p[0] * 0.44, p[1] * 0.44, max(p[2], 0) * 0.46), seg=12, rings=8)
    m.cylinder('#8a6a3a', matrix=T(0, 0, 0.04), seg=12, r=0.45, depth=0.08)
    # Horns: two solid curved cones, out to the sides and up, joined to the helmet.
    for s in (-1, 1):
        m.cone('#f3ead2', matrix=T(0, s * 0.52, 0.3) @ R('X', -62 * s), seg=8, r1=0.1, r2=0.05, depth=0.26)
        m.cone('#f3ead2', matrix=T(0, s * 0.68, 0.5) @ R('X', -25 * s), seg=8, r1=0.055, r2=0.0, depth=0.24)


def hat_chef(m):
    m.cylinder('#ffffff', matrix=T(0, 0, 0.22), seg=14, r=0.36, depth=0.42)
    for i in range(6):
        a = i / 6 * math.pi * 2
        m.sphere('#fbfbf7', matrix=T(math.cos(a) * 0.2, math.sin(a) * 0.2, 0.55), r=0.2, seg=8, rings=6)
    m.sphere('#fbfbf7', matrix=T(0, 0, 0.62), r=0.24, seg=8, rings=6)


# --- Things held --------------------------------------------------------------------

def rod(pole, handle, reel, tip=None):
    def build(m):
        m.cylinder(handle, matrix=T(0, 0, 0.12), seg=8, r=0.035, depth=0.26)
        m.cylinder(pole, matrix=T(0, 0, 0.82) @ S(1, 1, 1), seg=6, r=0.022, depth=1.2, deform=lambda p: (p[0] * (1 - (p[2] + 0.6) * 0.5), p[1] * (1 - (p[2] + 0.6) * 0.5), p[2]))
        m.cylinder(reel, matrix=T(0.06, 0, 0.3) @ R('Y', 90), seg=10, r=0.06, depth=0.05)
        m.cylinder(reel, matrix=T(0.03, 0, 0.3) @ R('Y', 90), seg=6, r=0.015, depth=0.06)
        for z in (0.55, 0.85, 1.12, 1.35):
            m.torus(reel, matrix=T(0.03, 0, z) @ R('Y', 90), R=0.018, r=0.005, seg=6, tube=3)
        if tip:
            m.sphere(tip, matrix=T(0, 0, 1.45), r=0.05, seg=8, rings=6)
    return build


def bobber(m):
    m.sphere(lambda c: hexrgb('#e8453c') if c.z > 0 else hexrgb('#ffffff'), seg=12, rings=8, r=0.5)
    m.cylinder('#e8453c', matrix=T(0, 0, 0.62), seg=6, r=0.05, depth=0.35)
    m.cylinder('#2b2b2b', matrix=T(0, 0, -0.55), seg=6, r=0.04, depth=0.15)


def ukulele(m):
    wood = '#d9a25a'
    for z, r in ((0.0, 0.26), (0.3, 0.2)):
        m.cylinder(wood, matrix=T(0, 0, z) @ R('X', 90), seg=14, r=r, depth=0.12)
    m.cylinder('#2a1d14', matrix=T(0, -0.062, 0.12) @ R('X', 90), seg=10, r=0.07, depth=0.01)
    m.box('#6a4426', matrix=T(0, 0, 0.75), size=(0.08, 0.05, 0.6))
    m.box('#4a2f1c', matrix=T(0, 0, 1.1), size=(0.12, 0.05, 0.16))
    m.box('#3a2a1c', matrix=T(0, -0.065, -0.1), size=(0.16, 0.02, 0.03))


# --- Furniture and village things ---------------------------------------------------

def f_chair(m):
    metal, cloth = '#5f6870', '#4f9a5a'
    for x in (-0.25, 0.25):
        for y in (-0.22, 0.22):
            m.cylinder(metal, matrix=T(x, y, 0.22) @ R('Y', 12 if x > 0 else -12), seg=5, r=0.02, depth=0.48)
    m.box(cloth, matrix=T(0, 0, 0.45), size=(0.56, 0.5, 0.04), deform=lambda p: (p[0], p[1], p[2] - 0.05 * (1 - (p[0] * 2) ** 2)))
    m.box(cloth, matrix=T(-0.28, 0, 0.75) @ R('Y', -12), size=(0.04, 0.5, 0.5))
    for y in (-0.27, 0.27):
        m.box(metal, matrix=T(0, y, 0.6), size=(0.5, 0.04, 0.04))


def f_lantern(m):
    m.cylinder('#3d3f44', matrix=T(0, 0, 0.04), seg=8, r=0.2, depth=0.08)
    m.cylinder('#ffd46a', matrix=T(0, 0, 0.3), seg=8, r=0.15, depth=0.42)
    for k in range(4):
        a = k / 4 * math.pi * 2
        m.cylinder('#3d3f44', matrix=T(math.cos(a) * 0.17, math.sin(a) * 0.17, 0.3), seg=4, r=0.015, depth=0.46)
    m.cone('#3d3f44', matrix=T(0, 0, 0.58), seg=8, r1=0.2, r2=0.06, depth=0.14)
    m.torus('#c9a24a', matrix=T(0, 0, 0.72) @ R('X', 90), R=0.09, r=0.015, seg=10, tube=4)


def f_radio(m):
    m.box('#8fd3b8', matrix=T(0, 0, 0.2), size=(0.6, 0.24, 0.36))
    m.cylinder('#2f3a40', matrix=T(-0.12, -0.125, 0.2) @ R('X', 90), seg=14, r=0.12, depth=0.02)
    for k in range(3):
        m.cylinder('#f3ead6', matrix=T(0.17, -0.125, 0.28 - k * 0.08) @ R('X', 90), seg=8, r=0.03, depth=0.03)
    m.cylinder('#c9ced2', matrix=T(0.24, 0, 0.6) @ R('Y', 18), seg=5, r=0.01, depth=0.5)
    m.box('#5f6870', matrix=T(0, 0, 0.42), size=(0.4, 0.04, 0.04))


def f_umbrella(m):
    m.sphere('#f2deb0', deform=lambda p: (p[0] * 0.4, p[1] * 0.4, max(p[2], 0) * 0.12), seg=10, rings=5)
    m.cylinder('#f3f0ea', matrix=T(0, 0, 1.2), seg=6, r=0.025, depth=2.4)
    m.cone(lambda c: hexrgb('#e8453c') if int((math.atan2(c.y, c.x) + math.pi) / (2 * math.pi) * 8) % 2 else hexrgb('#ffffff'), matrix=T(0, 0, 2.35), seg=8, r1=1.2, r2=0.02, depth=0.45, cap=False)


def f_flamingo(m):
    pink = '#f28ab0'
    m.sphere(pink, matrix=T(0, 0, 0.62) @ S(0.22, 0.12, 0.13), seg=10, rings=6)
    for k in range(5):
        m.sphere(pink, matrix=T(0.16 + math.sin(k * 0.7) * 0.06, 0, 0.72 + k * 0.06), r=0.035, seg=6, rings=4)
    m.sphere(pink, matrix=T(0.2, 0, 1.0), r=0.06, seg=8, rings=5)
    m.cone('#2b2b2b', matrix=T(0.28, 0, 0.98) @ R('Y', 110), seg=6, r1=0.03, r2=0.005, depth=0.1)
    m.cylinder('#d96a8a', matrix=T(0, 0, 0.27), seg=5, r=0.012, depth=0.55)
    m.cylinder('#d96a8a', matrix=T(-0.04, 0, 0.44) @ R('Y', 60), seg=5, r=0.012, depth=0.2)


def f_cooler(m):
    m.box('#3a78c9', matrix=T(0, 0, 0.2), size=(0.62, 0.4, 0.38))
    m.box('#ffffff', matrix=T(0, 0, 0.44), size=(0.66, 0.44, 0.1))
    m.box('#d9dde2', matrix=T(0, 0, 0.53), size=(0.36, 0.06, 0.04))


def f_plant(m):
    m.cone('#c9693a', matrix=T(0, 0, 0.17), seg=10, r1=0.17, r2=0.24, depth=0.34)
    m.cylinder('#5a3f2c', matrix=T(0, 0, 0.33), seg=10, r=0.22, depth=0.02)
    for k in range(7):
        a = k / 7 * math.pi * 2
        m.sphere('#3f8a4a' if k % 2 else '#4f9e5b', matrix=T(math.cos(a) * 0.22, math.sin(a) * 0.22, 0.6 + (k % 3) * 0.1) @ R('Z', math.degrees(a)) @ R('Y', -30) @ S(0.26, 0.15, 0.03), seg=8, rings=5)
        m.cylinder('#3f7a3f', matrix=T(math.cos(a) * 0.1, math.sin(a) * 0.1, 0.47) @ R('Z', math.degrees(a)) @ R('Y', 30), seg=4, r=0.012, depth=0.3)


def f_gnome(m):
    m.cone('#3a78c9', matrix=T(0, 0, 0.18), seg=10, r1=0.18, r2=0.12, depth=0.34)
    m.sphere('#f2c9a0', matrix=T(0, 0, 0.42), r=0.11, seg=10, rings=7)
    m.cone('#ffffff', matrix=T(0.06, 0, 0.32) @ R('Y', 15), seg=8, r1=0.11, r2=0.02, depth=0.2)
    m.cone('#d9453c', matrix=T(0, 0, 0.62), seg=10, r1=0.12, r2=0.01, depth=0.34)
    m.sphere('#e88a7a', matrix=T(0.11, 0, 0.42), r=0.035, seg=6, rings=4)
    m.cylinder('#7a4e2c', matrix=T(0.12, 0.14, 0.4) @ R('Y', 30), seg=4, r=0.008, depth=0.5)


def f_telescope(m):
    for k in range(3):
        a = k / 3 * math.pi * 2
        m.cylinder('#7a4e2c', matrix=T(math.cos(a) * 0.18, math.sin(a) * 0.18, 0.5) @ R('Z', math.degrees(a)) @ R('Y', -16), seg=5, r=0.02, depth=1.0)
    m.cylinder('#c9a24a', matrix=T(0.1, 0, 1.1) @ R('Y', 70), seg=10, r=0.07, depth=0.7)
    m.cylinder('#a8862f', matrix=T(-0.25, 0, 0.98) @ R('Y', 70), seg=10, r=0.05, depth=0.25)


def f_hammock(m):
    for x in (-0.9, 0.9):
        m.cylinder('#7a4e2c', matrix=T(x, 0, 0.7), seg=6, r=0.06, depth=1.4)
    m.box(lambda c: hexrgb('#e8453c') if int((c.y + 1) * 10) % 2 else hexrgb('#f6e6c2'), matrix=T(0, 0, 0.75), size=(1.5, 0.6, 0.04), deform=lambda p: (p[0], p[1], p[2] - 0.35 * (1 - (p[0] * 2) ** 2)))


def f_snowman(m):
    m.sphere('#f7f9fb', matrix=T(0, 0, 0.28), r=0.3, seg=12, rings=8)
    m.sphere('#f7f9fb', matrix=T(0, 0, 0.7), r=0.22, seg=12, rings=8)
    m.sphere('#f7f9fb', matrix=T(0, 0, 1.0), r=0.15, seg=10, rings=7)
    m.cone('#ef8a2a', matrix=T(0.2, 0, 1.0) @ R('Y', 90), seg=6, r1=0.03, r2=0, depth=0.14)
    m.torus('#d9453c', matrix=T(0, 0, 0.86), R=0.16, r=0.04, seg=12, tube=5)
    m.cylinder('#20232a', matrix=T(0, 0, 1.2), seg=10, r=0.09, depth=0.16)
    m.cylinder('#20232a', matrix=T(0, 0, 1.12), seg=12, r=0.15, depth=0.02)
    for s in (-1, 1):
        m.sphere('#20232a', matrix=T(0.13, s * 0.05, 1.05), r=0.02, seg=5, rings=3)


def f_tiki(m):
    m.cylinder('#c9a46a', matrix=T(0, 0, 0.75), seg=6, r=0.04, depth=1.5)
    m.cone('#a5784a', matrix=T(0, 0, 1.55), seg=8, r1=0.08, r2=0.14, depth=0.2)
    m.cone('#ffb23a', matrix=T(0, 0, 1.78), seg=6, r1=0.1, r2=0, depth=0.3)
    m.cone('#ffe07a', matrix=T(0, 0, 1.74), seg=6, r1=0.06, r2=0, depth=0.18)


def well(m):
    m.cylinder(lambda c: hexrgb('#9aa0a6') if (math.floor(c.z * 6) + math.floor(math.atan2(c.y, c.x) * 3)) % 2 else hexrgb('#868c93'), matrix=T(0, 0, 0.4), seg=14, r=0.75, depth=0.8)
    m.cylinder('#2f5f7a', matrix=T(0, 0, 0.7), seg=14, r=0.6, depth=0.02)
    for s in (-1, 1):
        m.box('#7a4e2c', matrix=T(0, s * 0.68, 1.15), size=(0.1, 0.1, 1.5))
    for s in (-1, 1):
        m.box('#b5523a', matrix=T(s * 0.45, 0, 2.05) @ R('Y', s * 35), size=(1.1, 1.7, 0.06))
    m.cylinder('#7a4e2c', matrix=T(0, 0, 1.5) @ R('X', 90), seg=6, r=0.05, depth=1.3)
    m.cone('#8a6a4a', matrix=T(0, 0, 1.0), seg=8, r1=0.12, r2=0.15, depth=0.2)


def mailbox(m):
    m.box('#7a4e2c', matrix=T(0, 0, 0.5), size=(0.1, 0.1, 1.0))
    m.box('#d9453c', matrix=T(0.1, 0, 1.05), size=(0.5, 0.26, 0.2))
    m.cylinder('#d9453c', matrix=T(0.1, 0, 1.15) @ R('Y', 90), seg=10, r=0.13, depth=0.5, deform=lambda p: (p[0], p[1], max(p[2], 0)))
    m.box('#f2c23a', matrix=T(-0.05, 0.15, 1.2), size=(0.03, 0.02, 0.22))
    m.box('#f2c23a', matrix=T(-0.0, 0.15, 1.3), size=(0.12, 0.02, 0.07))


def fence(m):
    for k in range(5):
        x = -0.8 + k * 0.4
        m.box('#f6f3ea', matrix=T(x, 0, 0.45), size=(0.12, 0.06, 0.9))
        m.cone('#f6f3ea', matrix=T(x, 0, 0.95) @ R('X', 90) @ S(1, 1, 0.5), seg=4, r1=0.09, r2=0, depth=0.12)
    for z in (0.3, 0.7):
        m.box('#ece6d8', matrix=T(0, 0.05, z), size=(1.8, 0.04, 0.08))


BUILD = {
    'hat-bucket': (hat_bucket, 'hat', 0.36), 'hat-straw': (hat_straw, 'hat', 0.3), 'hat-beanie': (hat_beanie, 'hat', 0.36),
    'hat-captain': (hat_captain, 'hat', 0.3), 'hat-flowers': (hat_flowers, 'hat', 0.14), 'hat-frog': (hat_frog, 'hat', 0.4),
    'hat-pirate': (hat_pirate, 'hat', 0.34), 'hat-top': (hat_top, 'hat', 0.48), 'hat-propeller': (hat_propeller, 'hat', 0.46),
    'hat-cowboy': (hat_cowboy, 'hat', 0.34), 'hat-crown': (hat_crown, 'hat', 0.26), 'hat-mushroom': (hat_mushroom, 'hat', 0.3),
    'hat-fish': (hat_fish, 'hat', 0.36), 'hat-sailor': (hat_sailor, 'hat', 0.24), 'hat-viking': (hat_viking, 'hat', 0.46),
    'hat-chef': (hat_chef, 'hat', 0.5),
    'rod-1': (rod('#a5784a', '#7a4e2c', '#9aa3ad'), 'prop', 1.6), 'rod-2': (rod('#3a78c9', '#c9a46a', '#c9ced2'), 'prop', 1.6),
    'rod-3': (rod('#d9453c', '#2b2b2b', '#e3b03f'), 'prop', 1.6), 'rod-4': (rod('#6a3fa0', '#2b2b2b', '#ecbf3a'), 'prop', 1.6),
    'rod-5': (rod('#5fd3c6', '#f3f0ea', '#f3f0ea', '#fff3a0'), 'prop', 1.6),
    'bobber': (bobber, 'prop', 0.2), 'ukulele': (ukulele, 'prop', 0.6),
    'f-chair': (f_chair, 'prop', 1.0), 'f-lantern': (f_lantern, 'prop', 0.6), 'f-radio': (f_radio, 'prop', 0.5), 'f-umbrella': (f_umbrella, 'prop', 2.6),
    'f-flamingo': (f_flamingo, 'prop', 1.0), 'f-cooler': (f_cooler, 'prop', 0.55), 'f-plant': (f_plant, 'prop', 0.9), 'f-gnome': (f_gnome, 'prop', 0.7),
    'f-telescope': (f_telescope, 'prop', 1.5), 'f-hammock': (f_hammock, 'prop', 1.3), 'f-snowman': (f_snowman, 'prop', 1.2), 'f-tiki': (f_tiki, 'prop', 1.8),
    'well': (well, 'prop', 2.6), 'mailbox': (mailbox, 'prop', 1.3), 'fence': (fence, 'prop', 1.0),
}
for fid, b in FISH.items():
    BUILD[f'fish-{fid}'] = (b, 'fish', None)


# --- Icons (models used only for their pictures) -------------------------------------

def coin(m):
    m.cylinder('#f2c23a', matrix=R('X', 90), seg=20, r=0.5, depth=0.1)
    m.cylinder('#e0a823', matrix=T(0, -0.055, 0) @ R('X', 90), seg=20, r=0.4, depth=0.02)
    m.fin('#c98f1f', [(-0.22, 0), (0.0, 0.1), (0.2, 0.0), (0.0, -0.1)], thickness=0.02, matrix=T(0, -0.07, 0))
    m.fin('#c98f1f', [(-0.2, 0), (-0.32, 0.09), (-0.32, -0.09)], thickness=0.02, matrix=T(0, -0.07, 0))


def token(m):
    shell = lambda c: hexrgb('#f6c9d6') if int((math.atan2(c.x, c.z + 0.6) + 3) * 5) % 2 else hexrgb('#eeb3c4')
    m.sphere(shell, deform=lambda p: (p[0] * 0.55, p[1] * 0.45, max(p[2], 0) * 0.18), seg=16, rings=6)
    m.sphere(shell, matrix=T(0, 0.28, 0.25) @ R('X', -60), deform=lambda p: (p[0] * 0.55, p[1] * 0.45, max(p[2], 0) * 0.18), seg=16, rings=6)
    m.sphere('#f3eeff', matrix=T(0, -0.05, 0.18), r=0.2, seg=14, rings=10)


def chest(wood, band, glow):
    def build(m):
        m.box(wood, matrix=T(0, 0, 0.3), size=(1.0, 0.65, 0.6))
        m.cylinder(wood, matrix=T(0, 0, 0.6) @ R('Y', 90), seg=12, r=0.33, depth=1.0, deform=lambda p: (p[0], p[1], max(p[2], 0)))
        for x in (-0.36, 0.36):
            m.box(band, matrix=T(x, 0, 0.3), size=(0.1, 0.67, 0.6))
            m.cylinder(band, matrix=T(x, 0, 0.6) @ R('Y', 90), seg=12, r=0.345, depth=0.1, deform=lambda p: (p[0], p[1], max(p[2], 0)))
        m.box(band, matrix=T(0, -0.34, 0.55), size=(0.16, 0.06, 0.2))
        m.sphere(glow, matrix=T(0, -0.37, 0.55), r=0.05, seg=8, rings=5)
    return build


def jar(fill, things):
    def build(m):
        m.cylinder('#cfe8ee', seg=14, r=0.32, depth=0.6)
        m.cylinder(fill, matrix=T(0, 0, -0.05), seg=14, r=0.3, depth=0.48)
        m.cylinder('#a8763f', matrix=T(0, 0, 0.34), seg=14, r=0.34, depth=0.1)
        things(m)
    return build


def worms(m):
    for k in range(4):
        a = k * 1.6
        for s in range(5):
            m.sphere('#e88a9a', matrix=T(math.cos(a + s * 0.5) * 0.2, -0.28, -0.15 + k * 0.1 + s * 0.02), r=0.05, seg=6, rings=4)


def glowworms(m):
    for k in range(9):
        a = k * 2.1
        m.sphere('#9ff7d8', matrix=T(math.cos(a) * 0.2, -0.27, -0.2 + k * 0.05), r=0.045, seg=6, rings=4)


def cricket_box(m):
    m.box('#b5854a', matrix=T(0, 0, 0.2), size=(0.8, 0.5, 0.4))
    m.box('#9a6d38', matrix=T(0, 0, 0.42), size=(0.84, 0.54, 0.06))
    for x in (-0.18, 0.18):
        m.sphere('#6fae4a', matrix=T(x, 0, 0.52) @ S(0.14, 0.06, 0.06), seg=8, rings=5)
        for s in (-1, 1):
            m.cylinder('#5a8f3a', matrix=T(x - 0.05, s * 0.06, 0.52) @ R('X', s * 50), seg=4, r=0.01, depth=0.14)


def minnow_bucket(m):
    m.cone('#b9c0c8', matrix=T(0, 0, 0.3), seg=14, r1=0.3, r2=0.38, depth=0.6)
    m.cylinder('#5fb8d6', matrix=T(0, 0, 0.56), seg=14, r=0.35, depth=0.04)
    for k in range(3):
        m.sphere('#d9dee2', matrix=T(-0.15 + k * 0.15, -0.05 + k * 0.06, 0.6) @ S(0.1, 0.03, 0.03), seg=6, rings=4)
    m.torus('#8a939c', matrix=T(0, 0, 0.6) @ R('X', 90), R=0.36, r=0.015, seg=12, tube=4)


def spoon(colour, stripe):
    def build(m):
        m.sphere(colour, deform=lambda p: (p[0] * 0.18, p[1] * 0.05, p[2] * 0.42), seg=12, rings=8)
        m.box(stripe, matrix=T(0, -0.05, 0), size=(0.2, 0.02, 0.1))
        m.torus('#8a939c', matrix=T(0, 0, 0.46) @ R('Y', 90), R=0.05, r=0.012, seg=8, tube=4)
        m.torus('#8a939c', matrix=T(0, 0, -0.5) @ R('Y', 90), R=0.08, r=0.014, seg=10, tube=4, )
    return build


def golden_lure(m):
    from fish import fish_body
    before = set(m.bm.verts)
    fish_body(m, dict(back='#f2c23a', belly='#ffe58a', h=0.36, w=0.2, fin='#e0a823'), L=1.0)
    m.torus('#8a939c', matrix=T(0, 0, -0.3), R=0.08, r=0.015, seg=10, tube=4)


def big_cooler(m):
    m.box('#d9453c', matrix=T(0, 0, 0.25), size=(0.9, 0.55, 0.5))
    m.box('#ffffff', matrix=T(0, 0, 0.55), size=(0.95, 0.6, 0.12))
    m.box('#d9dde2', matrix=T(0, 0, 0.66), size=(0.5, 0.08, 0.06))
    m.cone('#4f9e5b', matrix=T(0.32, -0.29, 0.25) @ R('X', 90), seg=4, r1=0.09, r2=0, depth=0.02)


def ticket(m):
    m.box('#f6e6c2', size=(0.9, 0.04, 0.5), deform=lambda p: (p[0], p[1], p[2] * (0.85 if abs(p[0]) > 0.4 else 1)))
    m.box('#3a78c9', matrix=T(0, -0.03, 0.02), size=(0.5, 0.02, 0.14), deform=lambda p: (p[0] * (1 - max(0, -p[2]) * 2), p[1], p[2]))
    m.box('#d9453c', matrix=T(0, -0.03, -0.17), size=(0.7, 0.02, 0.04))


BUILD.update({
    'coin': (coin, 'icon', 0.5), 'token': (token, 'icon', 0.4),
    'chest-tide': (chest('#a5784a', '#5f6870', '#5fd3c6'), 'icon', 1), 'chest-gilded': (chest('#7a3f2a', '#ecbf3a', '#ff6a8a'), 'icon', 1),
    'bait-worm': (jar('#7a5a3a', worms), 'icon', 0.6), 'bait-cricket': (cricket_box, 'icon', 0.6), 'bait-minnow': (minnow_bucket, 'icon', 0.6),
    'bait-glow': (jar('#2a3a5a', glowworms), 'icon', 0.6), 'bait-lure': (spoon('#d9dde2', '#d9453c'), 'icon', 0.6), 'bait-golden': (golden_lure, 'icon', 0.6),
    'upgrade-cooler': (big_cooler, 'icon', 0.6), 'boat-ticket': (ticket, 'icon', 0.5),
})


# --- Lures, finds and things to wear --------------------------------------------------

def lure_plain(m):
    m.torus('#9aa3ad', matrix=R('X', 90), R=0.25, r=0.04, seg=14, tube=5, )
    m.cylinder('#9aa3ad', matrix=T(0.25, 0, 0.35), seg=6, r=0.04, depth=0.7)
    m.cone('#9aa3ad', matrix=T(-0.18, 0, 0.12) @ R('Y', -30), seg=4, r1=0.05, r2=0, depth=0.16)


def lure_big(m):
    from fish import fish_body
    fish_body(m, dict(back='#3a78c9', belly='#f3f0ea', h=0.5, w=0.3, fin='#e8453c', blunt=0.8), L=1.0)
    m.torus('#9aa3ad', matrix=T(-0.1, 0, -0.32), R=0.1, r=0.02, seg=10, tube=4)


def lure_small(m):
    m.cylinder('#5a3f2c', matrix=R('Y', 90), seg=6, r=0.06, depth=0.5)
    for s in (-1, 1):
        m.fin('#d9dde2', [(0.0, 0.0), (-0.3, 0.32), (-0.05, 0.3)], thickness=0.01, matrix=T(0, s * 0.03, 0.04) @ R('X', s * 30))
    m.torus('#9aa3ad', matrix=T(-0.32, 0, -0.08), R=0.08, r=0.015, seg=8, tube=4)


def lure_sparkle(m):
    for k in range(5):
        a = k / 5 * math.pi * 2
        m.cone('#f6d04a', matrix=R('Y', math.degrees(a)) @ T(0, 0, 0.25) , seg=4, r1=0.12, r2=0, depth=0.35)
    m.sphere('#fff3a0', r=0.18, seg=10, rings=6)


def magnet(m):
    m.torus(lambda c: hexrgb('#d9453c') if c.x > -0.05 else hexrgb('#d9453c'), matrix=R('X', 90), R=0.3, r=0.09, seg=16, tube=6)
    for s in (-1, 1):
        m.box('#d9dde2', matrix=T(s * 0.3, 0, -0.35), size=(0.18, 0.18, 0.2))
    m.box('#ffffff', matrix=T(0, 0, -0.1), size=(0.42, 0.25, 0.5))


def twin_hook(m):
    for s in (-1, 1):
        m.torus('#9aa3ad', matrix=T(s * 0.18, 0, 0) @ R('X', 90), R=0.17, r=0.035, seg=12, tube=4)
    m.cylinder('#9aa3ad', matrix=T(0, 0, 0.35), seg=6, r=0.035, depth=0.5)


def clover(m):
    for k in range(4):
        a = k / 4 * math.pi * 2 + 0.78
        m.sphere('#4f9e5b', matrix=T(math.cos(a) * 0.17, 0, math.sin(a) * 0.17 + 0.25) @ S(0.17, 0.05, 0.17), seg=10, rings=6)
    m.cylinder('#3f7a3f', matrix=T(0.05, 0, -0.1) @ R('Y', 10), seg=5, r=0.025, depth=0.45)


def rain_charm(m):
    for x, z, r in ((0, 0.25, 0.25), (-0.25, 0.2, 0.18), (0.25, 0.2, 0.2), (0.1, 0.38, 0.18)):
        m.sphere('#e8eef4', matrix=T(x, 0, z), r=r, seg=10, rings=7)
    for k in range(4):
        m.cone('#5fb8e8', matrix=T(-0.24 + k * 0.16, 0, -0.12) @ R('X', 180), seg=6, r1=0.05, r2=0, depth=0.16)
        m.sphere('#5fb8e8', matrix=T(-0.24 + k * 0.16, 0, -0.05), r=0.05, seg=6, rings=4)


def detector(m):
    m.cylinder('#5f6870', matrix=T(0, 0, 0.6), seg=6, r=0.025, depth=1.1)
    m.cylinder('#3a3f44', matrix=T(0, 0, 0.02) @ S(1, 1.4, 1), seg=14, r=0.18, depth=0.04)
    m.box('#f2c23a', matrix=T(0, 0.04, 0.95), size=(0.1, 0.08, 0.14))
    m.sphere('#d9453c', matrix=T(0, 0.09, 1.0), r=0.025, seg=6, rings=4)
    m.box('#2b2b2b', matrix=T(0, -0.03, 1.12), size=(0.06, 0.06, 0.18))


def seaglass(m):
    m.sphere('#7fd3c3', deform=lambda p: (p[0] * 0.5, p[1] * 0.35, p[2] * 0.22), seg=7, rings=4)


def bounce_shroom(m):
    m.sphere(lambda c: hexrgb('#ffffff') if (math.sin(c.x * 9) * math.sin(c.y * 9) > 0.55 and c.z > 0.85) else hexrgb('#e8553c'), matrix=T(0, 0, 0.7), deform=lambda p: (p[0] * 1.1, p[1] * 1.1, max(p[2], -0.15) * 0.55), seg=16, rings=8)
    m.cylinder('#f3ead6', matrix=T(0, 0, 0.62), seg=16, r=1.0, depth=0.1)
    m.cone('#f6efe0', matrix=T(0, 0, 0.32), seg=12, r1=0.42, r2=0.32, depth=0.64)


def glasses_round(m):
    for s in (-1, 1):
        m.torus('#3a2a1c', matrix=T(s * 0.22, 0, 0) @ R('X', 90), R=0.16, r=0.025, seg=14, tube=4)
        m.cylinder('#d9eef6', matrix=T(s * 0.22, 0, 0) @ R('X', 90), seg=12, r=0.14, depth=0.01)
        m.box('#3a2a1c', matrix=T(s * 0.4, 0.2, 0.02), size=(0.03, 0.4, 0.03))
    m.box('#3a2a1c', matrix=T(0, 0, 0.03), size=(0.14, 0.03, 0.03))


def sunglasses(m):
    for s in (-1, 1):
        m.box('#1b1d22', matrix=T(s * 0.22, 0, 0), size=(0.34, 0.04, 0.2), deform=lambda p: (p[0], p[1], p[2] - (0.03 if p[2] < 0 and abs(p[0]) > 0.1 else 0)))
        m.box('#1b1d22', matrix=T(s * 0.4, 0.2, 0.05), size=(0.03, 0.4, 0.03))
    m.box('#1b1d22', matrix=T(0, 0, 0.06), size=(0.14, 0.04, 0.04))


def scarf(m):
    m.torus(lambda c: hexrgb('#d9453c') if int((math.atan2(c.y, c.x) + 3.2) * 3) % 2 else hexrgb('#f3ead6'), R=0.45, r=0.1, seg=18, tube=6)
    m.box('#d9453c', matrix=T(0.25, -0.38, -0.28) @ R('X', 10), size=(0.16, 0.06, 0.5))


def bowtie(m):
    for s in (-1, 1):
        m.cone('#d9453c', matrix=T(s * 0.16, 0, 0) @ R('Y', s * 90) @ S(1, 0.6, 1), seg=4, r1=0.16, r2=0.04, depth=0.3)
    m.box('#b5352a', size=(0.1, 0.08, 0.12))


def backpack(m):
    m.box('#4f9e5b', matrix=T(0, 0, 0.3), size=(0.7, 0.35, 0.8), deform=lambda p: (p[0] * (1 - max(0, p[2]) * 0.15), p[1], p[2]))
    m.box('#3f8a4a', matrix=T(0, -0.2, 0.18), size=(0.5, 0.1, 0.35))
    m.box('#f2c23a', matrix=T(0, -0.26, 0.24), size=(0.12, 0.02, 0.06))
    m.cylinder('#e8eef4', matrix=T(0, 0.02, 0.75) @ R('Y', 90), seg=10, r=0.12, depth=0.62)


def flower_pin(m):
    for k in range(6):
        a = k / 6 * math.pi * 2
        m.sphere('#f08aa8', matrix=T(math.cos(a) * 0.16, 0, math.sin(a) * 0.16) @ S(0.12, 0.05, 0.12), seg=8, rings=5)
    m.sphere('#f6d04a', r=0.1, seg=8, rings=5)
    m.sphere('#5f9a4a', matrix=T(0.2, 0.02, -0.18) @ S(0.16, 0.04, 0.07), seg=8, rings=4)


def ticket(colour, band):
    def build(m):
        m.box(colour, size=(0.9, 0.04, 0.55))
        m.box('#c9ced2', matrix=T(0, -0.03, -0.06), size=(0.7, 0.02, 0.28))
        m.box(band, matrix=T(0, -0.03, 0.19), size=(0.7, 0.02, 0.08))
        m.sphere('#f2c23a', matrix=T(0.32, -0.04, 0.19), r=0.05, seg=8, rings=5)
    return build


BUILD.update({
    'lure-none': (lure_plain, 'icon', 0.5), 'lure-big': (lure_big, 'icon', 0.5), 'lure-small': (lure_small, 'icon', 0.5),
    'lure-sparkle': (lure_sparkle, 'icon', 0.5), 'lure-magnet': (magnet, 'icon', 0.5), 'lure-twin': (twin_hook, 'icon', 0.5),
    'lure-lucky': (clover, 'icon', 0.5), 'lure-rain': (rain_charm, 'icon', 0.5),
    'detector': (detector, 'prop', 1.0), 'seaglass': (seaglass, 'prop', 0.12), 'bounce-shroom': (bounce_shroom, 'prop', 1.4),
    'x-glasses': (glasses_round, 'extra', 0.2), 'x-shades': (sunglasses, 'extra', 0.2), 'x-scarf': (scarf, 'extra', 0.25),
    'x-bowtie': (bowtie, 'extra', 0.12), 'x-backpack': (backpack, 'extra', 0.5), 'x-flower': (flower_pin, 'extra', 0.14),
    'ticket-penny': (ticket('#f6e6c2', '#4f9e5b'), 'icon', 0.5), 'ticket-lucky': (ticket('#e6f2ff', '#3a78c9'), 'icon', 0.5),
    'ticket-splash': (ticket('#ffe8f0', '#d9453c'), 'icon', 0.5),
})


def pier(m):
    """A 3 m square of pier: weathered planks on top (at 2.4 m), posts only underneath."""
    for k in range(6):
        shade = '#b39472' if k % 2 else '#a5865f'
        m.box(shade, matrix=T(0, -1.25 + k * 0.5, 2.34), size=(3.02, 0.47, 0.12))
    for x in (-1.3, 1.3):
        for y in (-1.3, 1.3):
            m.cylinder('#6f5640', matrix=T(x, y, 1.14), seg=8, r=0.13, depth=2.28)
    for y in (-1.3, 1.3):
        m.box('#7a5f45', matrix=T(0, y, 2.18), size=(3.0, 0.16, 0.2))


BUILD['pier'] = (pier, 'prop', 2.4)


def main():
    wanted = [a for a in sys.argv[1:] if a in BUILD] or list(BUILD)
    index_file = os.path.join(ROOT, 'public', 'models', 'index.json')
    index = json.load(open(index_file)) if os.path.exists(index_file) else {}
    made = 0
    for mid in wanted:
        # A model fal made is kept; only gaps (or earlier Blender ones) are filled.
        if mid in index and index[mid].get('source') != 'blender' and os.path.exists(os.path.join(OUT, f'{mid}.glb')):
            continue
        clean()
        build, kind, h = BUILD[mid]
        m = Model()
        build(m)
        m.save(mid, os.path.join(OUT, f'{mid}.glb'))
        index[mid] = {'kind': kind, 'h': h, 'source': 'blender'}
        made += 1
    json.dump(index, open(index_file, 'w'))
    print(f'made {made} models in Blender')


main()
