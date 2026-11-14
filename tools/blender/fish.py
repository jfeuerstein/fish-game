"""The fish (and things that are not fish), built in Blender. Z is up, the head points to +x."""
import math

from mathutils import Vector

from lib import Model, R, S, T, hexrgb, mix


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def body_colour(f, L, H):
    back = hexrgb(f['back'])
    belly = hexrgb(f.get('belly', '#f2efe6'))
    pattern = f.get('pattern')

    def colour(c):
        u = c.x / (L / 2)  # -1 tail .. 1 head
        v = c.z / (H / 2)  # -1 belly .. 1 back
        col = mix(belly, back, smooth(-0.35, 0.35, v))
        if pattern:
            kind = pattern[0]
            pc = hexrgb(pattern[2]) if len(pattern) > 2 else hexrgb('#2a2f3a')
            if kind == 'bars' and math.sin(u * pattern[1] * math.pi) > 0.35 and v > -0.4 and u < 0.7:
                col = pc
            elif kind == 'stripe' and abs(v - pattern[1]) < 0.18 and u < 0.85:
                col = pc
            elif kind == 'spots':
                h = math.sin(c.x * 91.7 + c.z * 47.3 + c.y * 13.1) * 43758.5453
                if h - math.floor(h) < pattern[1] and v > -0.5:
                    col = pc
            elif kind == 'waves' and v > 0.05 and math.sin(u * 14 + math.sin(v * 9) * 2) > 0.3:
                col = pc
            elif kind == 'patches':
                h = math.sin(math.floor(c.x * 6) * 12.9 + math.floor(c.z * 6) * 78.2) * 43758.5
                if h - math.floor(h) < pattern[1]:
                    col = pc
        return col

    return colour


def fish_body(m, f, L=1.0):
    H = L * f.get('h', 0.4)
    W = L * f.get('w', 0.22)
    blunt = f.get('blunt', 0.3)
    hump = f.get('hump', 0.0)

    def shape(p):
        x, y, z = p
        u = x  # -1 .. 1, +1 is the head
        taper = 1 - 0.78 * smooth(-0.1, -1.0, u) - blunt * 0.25 * smooth(0.6, 1.0, u)
        zz = z * H / 2 * taper + (hump * H * 0.25 * (1 - u * u) if z > 0 else 0) - 0.04 * H * (1 - u * u) * (1 if z < 0 else 0)
        return (x * L / 2, y * W / 2 * taper, zz)

    m.sphere(body_colour(f, L, H), seg=f.get('seg', 12), rings=8, deform=shape)
    fin = hexrgb(f.get('fin', f['back']))
    # The tail, at the narrow end.
    tx = -L / 2 + 0.02 * L
    th = H * f.get('tail', 0.85)
    kind = f.get('tailshape', 'fork')
    if kind == 'fork':
        pts = [(tx + 0.04 * L, 0), (tx - 0.2 * L, th * 0.6), (tx - 0.12 * L, 0.02 * L), (tx - 0.12 * L, -0.02 * L), (tx - 0.2 * L, -th * 0.6)]
    elif kind == 'moon':
        pts = [(tx + 0.04 * L, 0), (tx - 0.14 * L, th * 0.75), (tx - 0.1 * L, 0), (tx - 0.14 * L, -th * 0.75)]
    else:
        pts = [(tx + 0.04 * L, 0), (tx - 0.12 * L, th * 0.45), (tx - 0.2 * L, th * 0.3), (tx - 0.22 * L, 0), (tx - 0.2 * L, -th * 0.3), (tx - 0.12 * L, -th * 0.45)]
    m.fin(fin, pts, thickness=0.03 * L)
    # Fins on the back and belly.
    d = f.get('dorsal', 1.0)
    if d:
        top = H / 2 * 0.92
        pts = [(0.18 * L, top - 0.02 * L), (-0.05 * L, top + 0.22 * H * d), (-0.22 * L, top + 0.05 * H * d), (-0.25 * L, top - 0.05 * L)]
        if f.get('spiky'):
            pts = [(0.2 * L, top - 0.02 * L), (0.12 * L, top + 0.3 * H), (0.04 * L, top + 0.12 * H), (-0.04 * L, top + 0.32 * H), (-0.12 * L, top + 0.12 * H), (-0.2 * L, top + 0.25 * H), (-0.26 * L, top - 0.04 * L)]
        m.fin(fin, pts, thickness=0.025 * L)
    m.fin(fin, [(-0.05 * L, -H / 2 * 0.8), (-0.15 * L, -H / 2 - 0.12 * H), (-0.25 * L, -H / 2 * 0.65)], thickness=0.025 * L)
    # Side fins.
    for side in (-1, 1):
        m.fin(fin, [(0.2 * L, 0), (0.06 * L, -0.12 * H), (0.04 * L, 0.04 * H)], thickness=0.02 * L, matrix=T(0, side * W * 0.42, -H * 0.1) @ R('X', side * 20))
    eyes(m, L * 0.33, W * 0.36, H * 0.1, L * f.get('eye', 0.065))
    return H, W


def eyes(m, x, y, z, r, white=True):
    for side in (-1, 1):
        if white:
            m.sphere('#ffffff', matrix=T(x, side * y, z) @ S(r, r * 0.5, r), seg=8, rings=5)
        m.sphere('#1b1d22', matrix=T(x + r * 0.15, side * (y + r * 0.35), z) @ S(r * 0.6, r * 0.35, r * 0.6), seg=6, rings=4)


def fish(f):
    def build(m):
        fish_body(m, f)
        extra = f.get('extra')
        if extra:
            extra(m, f)

    return build


# --- Special shapes ---------------------------------------------------------------

def sword(m, f):
    m.cone('#3a4a63', matrix=T(0.75, 0, 0.0) @ R('Y', 90), seg=6, r1=0.05, r2=0.004, depth=0.55)


def lure(m, f):
    m.cylinder('#2b2a33', matrix=T(0.38, 0, 0.32) @ R('Y', -35), seg=5, r=0.012, depth=0.28)
    m.sphere('#ffe066', matrix=T(0.5, 0, 0.42), r=0.06, seg=8, rings=6)
    for i in range(5):
        m.cone('#ffffff', matrix=T(0.46, -0.1 + i * 0.05, -0.02) @ R('X', 180), seg=4, r1=0.018, r2=0, depth=0.06)


def puffer_spikes(m, f):
    for i in range(26):
        a = i * 2.39996
        zz = 1 - 2 * (i + 0.5) / 26
        rr = math.sqrt(1 - zz * zz)
        d = Vector((math.cos(a) * rr * 0.9, math.sin(a) * rr * 0.8, zz * 0.8)).normalized()
        p = Vector((d.x * 0.42, d.y * 0.36, d.z * 0.38))
        rot = Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()
        m.cone('#e9c45a', matrix=T(*p) @ rot, seg=4, r1=0.03, r2=0, depth=0.1)


def axolotl_gills(m, f):
    for side in (-1, 1):
        for k in range(3):
            m.cone('#e2588a', matrix=T(0.28 - k * 0.02, side * 0.12, 0.08 + k * 0.05) @ R('X', side * (60 - k * 25)), seg=5, r1=0.03, r2=0.005, depth=0.16)
    for x in (0.18, -0.15):
        for side in (-1, 1):
            m.cylinder('#f2a3bd', matrix=T(x, side * 0.12, -0.12) @ R('X', side * 40), seg=5, r=0.025, depth=0.14)


def whiskers(m, f):
    for side in (-1, 1):
        for k in (0, 1):
            m.cylinder('#3b3833', matrix=T(0.52, side * 0.06, -0.04 - k * 0.04) @ R('Z', side * (25 + k * 15)) @ R('Y', 90 + k * 20), seg=4, r=0.008, depth=0.22)


def snout(m, f):
    m.sphere(f['back'], matrix=T(0.52, 0, -0.02) @ S(0.14, 0.06, 0.04), seg=8, rings=5)


def lobe_fins(m, f):
    for x, z in ((0.15, -0.16), (-0.1, -0.17), (-0.05, 0.17)):
        m.sphere('#2b4a8a', matrix=T(x, 0, z) @ S(0.08, 0.025, 0.05), seg=6, rings=4)


def long_body(f):
    """An eel or an oarfish: a long body in an S."""
    def build(m):
        n = 14
        L = 1.0
        back, belly = hexrgb(f['back']), hexrgb(f.get('belly', f['back']))
        for i in range(n):
            t = i / (n - 1)
            x = (t - 0.5) * L
            y = math.sin(t * math.pi * 2) * 0.08
            r = 0.05 * (1 - 0.7 * smooth(0.3, 1.0, 1 - t)) * (0.6 + 0.4 * smooth(0, 0.15, t))
            m.sphere(lambda c, b=back, l=belly: mix(l, b, smooth(-0.02, 0.02, c.z)), matrix=T(x, y, 0) @ S(L / n * 0.85, r, r * 1.2), seg=8, rings=5)
            if f.get('crest') and i % 2 == 0:
                m.fin(f['crest'], [(x - 0.03, 0.04), (x, 0.11 + (0.1 if i > n - 3 else 0)), (x + 0.03, 0.04)], thickness=0.01, matrix=T(0, y, 0))
        eyes(m, L / 2 - 0.02, 0.03, 0.015, 0.015)
    return build


def flat_fish(f):
    def build(m):
        L = 1.0
        colour = body_colour(f, L, 0.7)
        m.sphere(lambda c: colour(Vector((c.x, c.y, c.z * 6 + 0.2))) if c.z > 0 else hexrgb('#f2ece0'), deform=lambda p: (p[0] * 0.5, p[1] * 0.34, p[2] * 0.06), seg=14, rings=8)
        m.fin(f['back'], [(-0.46, 0), (-0.62, 0.12), (-0.6, -0.12)], thickness=0.02, matrix=R('X', 90))
        for side in (-1, 1):
            m.fin(f['back'], [(0.4, 0), (0, 0.1), (-0.42, 0)], thickness=0.015, matrix=T(0, side * 0.33, 0) @ R('X', 90) @ S(1, side, 1))
        for side in (-1, 1):
            m.sphere('#ffffff', matrix=T(0.28, side * 0.05, 0.05), r=0.035, seg=8, rings=5)
            m.sphere('#1b1d22', matrix=T(0.29, side * 0.05, 0.075), r=0.02, seg=6, rings=4)
    return build


def crab(m):
    shell = '#d9563e'
    m.sphere(shell, deform=lambda p: (p[0] * 0.32, p[1] * 0.42, p[2] * 0.16 + (0.03 if p[2] > 0 else 0)), seg=12, rings=7)
    for side in (-1, 1):
        for k in range(3):
            m.cylinder(shell, matrix=T(-0.1 + k * 0.1, side * 0.42, -0.06) @ R('X', side * 55), seg=5, r=0.03, depth=0.3)
        m.cylinder(shell, matrix=T(0.3, side * 0.3, 0.02) @ R('Z', side * 30) @ R('Y', 70), seg=6, r=0.04, depth=0.22)
        m.sphere(shell, matrix=T(0.45, side * 0.38, 0.08) @ S(0.13, 0.08, 0.1), seg=8, rings=6)
        m.cone('#f0e2c8', matrix=T(0.55, side * 0.38, 0.12) @ R('Y', 70), seg=5, r1=0.04, r2=0, depth=0.1)
        m.cylinder('#2c2a2a', matrix=T(0.25, side * 0.08, 0.16), seg=5, r=0.012, depth=0.12)
        m.sphere('#1b1d22', matrix=T(0.25, side * 0.08, 0.23), r=0.03, seg=6, rings=4)


def crayfish(m):
    sh = '#a8492f'
    for i in range(6):
        r = 0.1 - i * 0.012
        m.sphere(sh, matrix=T(0.2 - i * 0.1, 0, 0) @ S(0.07, r, r * 0.8), seg=8, rings=5)
    m.fin(sh, [(-0.33, 0), (-0.48, 0.1), (-0.48, -0.1)], thickness=0.02, matrix=R('X', 90))
    for side in (-1, 1):
        m.cylinder(sh, matrix=T(0.35, side * 0.12, 0) @ R('Z', side * 25) @ R('Y', 90), seg=5, r=0.025, depth=0.2)
        m.sphere(sh, matrix=T(0.5, side * 0.18, 0) @ S(0.11, 0.05, 0.04), seg=8, rings=5)
        for k in range(3):
            m.cylinder(sh, matrix=T(0.1 - k * 0.08, side * 0.14, -0.05) @ R('X', side * 60), seg=4, r=0.012, depth=0.14)
        m.cylinder('#5a2f22', matrix=T(0.45, side * 0.03, 0.03) @ R('Z', side * 10) @ R('Y', 80), seg=4, r=0.006, depth=0.35)
    eyes(m, 0.3, 0.045, 0.05, 0.022, white=False)


def squid(m):
    pink = '#e78aa0'
    m.sphere(pink, deform=lambda p: (p[0] * 0.38 + (0.05 if p[0] > 0 else 0), p[1] * 0.13, p[2] * 0.13), seg=10, rings=6, matrix=T(0.15, 0, 0))
    m.fin(pink, [(0.5, 0), (0.35, 0.16), (0.3, 0)], thickness=0.02)
    m.fin(pink, [(0.5, 0), (0.35, -0.16), (0.3, 0)], thickness=0.02)
    for k in range(8):
        a = k / 8 * math.pi * 2
        m.cone(pink, matrix=T(-0.28, math.cos(a) * 0.06, math.sin(a) * 0.06) @ R('Y', -90) @ R('X', math.degrees(math.sin(a)) * 0.3), seg=5, r1=0.03, r2=0.006, depth=0.35)
    eyes(m, -0.15, 0.1, 0.02, 0.04)


def octopus(m):
    o = '#e0793f'
    m.sphere(o, matrix=T(0, 0, 0.18) @ S(0.25, 0.25, 0.3), seg=12, rings=8)
    for k in range(8):
        a = k / 8 * math.pi * 2
        for s in range(4):
            r = 0.05 - s * 0.01
            d = 0.18 + s * 0.09
            m.sphere(o, matrix=T(math.cos(a) * d, math.sin(a) * d, -0.05 - s * 0.02 + (0.06 if s == 3 else 0)), r=r, seg=6, rings=4)
    eyes(m, 0.2, 0.09, 0.15, 0.05)


def jelly(m):
    lil = '#cdb8ee'
    m.sphere(lil, deform=lambda p: (p[0] * 0.35, p[1] * 0.35, max(p[2], -0.15) * 0.3), seg=12, rings=8, matrix=T(0, 0, 0.1))
    for k in range(8):
        a = k / 8 * math.pi * 2
        m.cone('#e4d8f7', matrix=T(math.cos(a) * 0.22, math.sin(a) * 0.22, 0.02) @ R('X', 180), seg=4, r1=0.03, r2=0.005, depth=0.35)
    for k in range(4):
        a = k / 4 * math.pi * 2
        m.torus('#b296e2', matrix=T(math.cos(a) * 0.08, math.sin(a) * 0.08, 0.17), R=0.04, r=0.012, seg=8, tube=4)


def seahorse(m):
    o = '#ea8a3a'
    pts = [(0, 0.35, 0.08), (0.04, 0.22, 0.1), (0.02, 0.08, 0.1), (-0.02, -0.06, 0.085), (0, -0.18, 0.06), (0.06, -0.28, 0.045), (0.12, -0.32, 0.035), (0.14, -0.26, 0.03)]
    for x, z, r in pts:
        m.sphere(o, matrix=T(x, 0, z) @ S(r, r * 0.8, r), seg=8, rings=6)
    m.cylinder(o, matrix=T(0.12, 0, 0.36) @ R('Y', 80), seg=6, r=0.025, depth=0.16)
    m.fin('#f4b16b', [(-0.08, 0.1), (-0.16, 0.18), (-0.15, 0.02)], thickness=0.01)
    eyes(m, 0.05, 0.06, 0.38, 0.022)


def turtle(m):
    m.sphere(lambda c: hexrgb('#7a5a33') if (math.floor(c.x * 9) + math.floor(c.y * 9)) % 2 else hexrgb('#5f4527'), deform=lambda p: (p[0] * 0.36, p[1] * 0.3, max(p[2], -0.2) * 0.18), seg=12, rings=8, matrix=T(0, 0, 0.08))
    m.sphere('#7fa45a', matrix=T(0.42, 0, 0.08) @ S(0.11, 0.09, 0.08), seg=8, rings=6)
    for x in (0.22, -0.22):
        for side in (-1, 1):
            m.sphere('#7fa45a', matrix=T(x, side * 0.27, 0.0) @ S(0.09, 0.06, 0.03), seg=6, rings=4)
    m.cone('#7fa45a', matrix=T(-0.4, 0, 0.04) @ R('Y', -90), seg=5, r1=0.03, r2=0, depth=0.1)
    eyes(m, 0.48, 0.05, 0.11, 0.02, white=False)


def boot(m):
    br = '#7a4e2c'
    m.box(br, matrix=T(0, 0, 0.35), size=(0.32, 0.26, 0.55))
    m.box(br, matrix=T(0.22, 0, 0.1), size=(0.5, 0.27, 0.22), deform=lambda p: (p[0], p[1], p[2] - (0.1 if p[0] > 0.3 and p[2] > 0 else 0)))
    m.box('#3b2a1c', matrix=T(0.1, 0, -0.02), size=(0.78, 0.3, 0.06))
    m.cylinder('#3b2a1c', matrix=T(0, 0, 0.63), seg=10, r=0.18, depth=0.05)
    m.box('#5f8f3a', matrix=T(0.15, 0.14, 0.3) @ R('Y', 30), size=(0.06, 0.02, 0.3))


def can(m):
    m.cylinder(lambda c: hexrgb('#b9c0c8') if abs(c.z) > 0.18 else hexrgb('#9aa3ad'), seg=12, r=0.14, depth=0.42, deform=lambda p: (p[0] * (1 - 0.15 * math.sin(p[2] * 8)), p[1], p[2]))


def seaweed(m):
    for k, (x, y) in enumerate(((0, 0), (0.08, 0.05), (-0.07, 0.04), (0.03, -0.07))):
        for s in range(5):
            m.sphere('#4f8f43' if s % 2 else '#3d7a39', matrix=T(x + math.sin(s + k) * 0.05, y, s * 0.13) @ S(0.05, 0.02, 0.09), seg=6, rings=4)


def bottle(m):
    green = '#4f9a6a'
    m.cylinder(green, seg=10, r=0.12, depth=0.45)
    m.cone(green, matrix=T(0, 0, 0.3), seg=10, r1=0.12, r2=0.04, depth=0.16)
    m.cylinder(green, matrix=T(0, 0, 0.42), seg=8, r=0.04, depth=0.1)
    m.cylinder('#b48a5a', matrix=T(0, 0, 0.5), seg=8, r=0.035, depth=0.07)
    m.cylinder('#f3ead2', matrix=T(0, 0, 0.0) @ R('X', 90), seg=8, r=0.06, depth=0.14)


def wrap(fn):
    return lambda m: fn(m)


# id -> (builder, axis that is "length": the game holds it lengthways)
FISH = {
    'sardine': fish(dict(back='#4f7fb0', belly='#e6eef2', h=0.28, w=0.14, pattern=('spots', 0.1, '#28456a'))),
    'mackerel': fish(dict(back='#2f6f63', belly='#e8eef0', h=0.3, w=0.16, pattern=('waves', 0, '#1f3f3a'), tailshape='fork')),
    'flounder': flat_fish(dict(back='#b08a5a', pattern=('spots', 0.25, '#7a5a38'))),
    'sea-bass': fish(dict(back='#6f7a86', belly='#e3e6e8', h=0.36, spiky=True, fin='#59626c')),
    'red-snapper': fish(dict(back='#e0505a', belly='#f6c2b8', h=0.42, spiky=True, eye=0.08, fin='#d84552')),
    'pufferfish': fish(dict(back='#e8c24f', belly='#fbf0c8', h=0.78, w=0.72, blunt=0.9, tail=0.5, tailshape='round', dorsal=0.4, pattern=('spots', 0.12, '#8a6a2a'), extra=puffer_spikes)),
    'crab': wrap(crab),
    'squid': wrap(squid),
    'seahorse': wrap(seahorse),
    'jellyfish': wrap(jelly),
    'tuna': fish(dict(back='#24477a', belly='#dfe6ec', h=0.38, w=0.26, tailshape='moon', fin='#e6c43a', blunt=0.5)),
    'swordfish': fish(dict(back='#3a4a63', belly='#d7dde3', h=0.3, w=0.18, tailshape='moon', dorsal=2.2, extra=sword)),
    'anglerfish': fish(dict(back='#3a3340', belly='#5a4e5c', h=0.62, w=0.5, blunt=0.9, tail=0.55, tailshape='round', dorsal=0.3, eye=0.06, extra=lure)),
    'oarfish': long_body(dict(back='#c9d2dc', belly='#eef2f6', crest='#d8453c')),
    'coelacanth': fish(dict(back='#2d4f8f', belly='#3a5f9f', h=0.36, w=0.24, tailshape='round', pattern=('spots', 0.16, '#e6eef8'), extra=lobe_fins)),
    'octopus': wrap(octopus),
    'bluegill': fish(dict(back='#5f7a4a', belly='#e9a24f', h=0.6, w=0.2, tail=0.6, tailshape='round', pattern=('bars', 3, '#4a5f3a'), fin='#4f6a5a')),
    'perch': fish(dict(back='#c9a63a', belly='#f2e6b0', h=0.36, spiky=True, pattern=('bars', 3, '#3d4a2a'), fin='#e2833a')),
    'carp': fish(dict(back='#8a6a3a', belly='#e0c48a', h=0.42, w=0.26, hump=0.3, pattern=('patches', 0.2, '#6f532c'), extra=whiskers)),
    'koi': fish(dict(back='#ffffff', belly='#ffffff', h=0.36, w=0.24, pattern=('patches', 0.45, '#ec6a2a'), fin='#f3f0ea', extra=whiskers)),
    'catfish': fish(dict(back='#6c7278', belly='#c9ccd0', h=0.3, w=0.26, blunt=0.8, tailshape='round', extra=whiskers)),
    'goldfish': fish(dict(back='#f08a2a', belly='#f7b05a', h=0.6, w=0.36, blunt=0.8, tail=1.3, tailshape='round', fin='#f6a04a')),
    'turtle': wrap(turtle),
    'axolotl': fish(dict(back='#f3a9c2', belly='#f9d0de', h=0.26, w=0.26, blunt=0.9, tailshape='round', tail=0.7, dorsal=0.6, eye=0.05, extra=axolotl_gills)),
    'trout': fish(dict(back='#6f8a5a', belly='#eae4d6', h=0.3, pattern=('stripe', 0.0, '#e48aa0'), fin='#7f8a6a')),
    'salmon': fish(dict(back='#6c7f94', belly='#f2b4a6', h=0.32, w=0.2, hump=0.25, pattern=('spots', 0.08, '#3b4552'))),
    'crayfish': wrap(crayfish),
    'pike': fish(dict(back='#5a7a3e', belly='#e6e2c2', h=0.24, w=0.16, pattern=('spots', 0.22, '#d7d9a0'), extra=snout)),
    'sturgeon': fish(dict(back='#6b7076', belly='#c8cbcd', h=0.24, w=0.2, tailshape='fork', pattern=('stripe', 0.55, '#d9dcdc'), extra=whiskers)),
    'golden-trout': fish(dict(back='#e6b432', belly='#f8e08a', h=0.3, pattern=('stripe', 0.0, '#e2523a'), fin='#ef8a3a')),
    'eel': long_body(dict(back='#4a5530', belly='#a9a47a')),
    'minnow': fish(dict(back='#9aa6ae', belly='#eef1f2', h=0.24, w=0.12, pattern=('stripe', 0.1, '#3a4248'))),
    'boot': wrap(boot),
    'can': wrap(can),
    'seaweed': wrap(seaweed),
    'bottle': wrap(bottle),
}
