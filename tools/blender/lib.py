"""Small helpers for building low-poly game models in Blender (bpy as a Python module).

Every model is one mesh coloured per face (a colour attribute, which the glTF exporter writes as
COLOR_0) and flat shaded, so it matches the faceted look of the generated models.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(4))


class Model:
    """A mesh being built from parts. Each part is made, moved into place and coloured."""

    def __init__(self):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.color.new('Col')

    def _take(self, result, matrix, colour, deform=None):
        verts = [v for v in result['verts']]
        for v in verts:
            if deform:
                v.co = Vector(deform(v.co.copy()))
            v.co = matrix @ v.co
        faces = set()
        for v in verts:
            for f in v.link_faces:
                faces.add(f)
        for f in faces:
            c = colour(f.calc_center_median()) if callable(colour) else colour
            if isinstance(c, str):
                c = hexrgb(c)
            for loop in f.loops:
                loop[self.col] = c
        return verts

    def sphere(self, colour, matrix=Matrix(), seg=10, rings=7, r=1.0, deform=None):
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=r)
        return self._take(res, matrix, colour, deform)

    def cone(self, colour, matrix=Matrix(), seg=8, r1=1.0, r2=0.0, depth=1.0, deform=None, cap=True):
        res = bmesh.ops.create_cone(self.bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=depth)
        return self._take(res, matrix, colour, deform)

    def cylinder(self, colour, matrix=Matrix(), seg=8, r=1.0, depth=1.0, deform=None):
        return self.cone(colour, matrix, seg, r, r, depth, deform)

    def box(self, colour, matrix=Matrix(), size=(1, 1, 1), deform=None):
        res = bmesh.ops.create_cube(self.bm, size=1.0)
        sx, sy, sz = size
        return self._take(res, matrix @ Matrix.Diagonal((sx, sy, sz, 1)), colour, deform)

    def torus(self, colour, matrix=Matrix(), R=1.0, r=0.25, seg=12, tube=6):
        """A ring lying flat (in the x-y plane), built as a grid of quads."""
        verts = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            row = []
            for j in range(tube):
                b = 2 * math.pi * j / tube
                p = Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
                row.append(self.bm.verts.new(p))
            verts.append(row)
        for i in range(seg):
            for j in range(tube):
                a, b = verts[i][j], verts[(i + 1) % seg][j]
                c, d = verts[(i + 1) % seg][(j + 1) % tube], verts[i][(j + 1) % tube]
                self.bm.faces.new((a, b, c, d))
        flat = [v for row in verts for v in row]
        return self._take({'verts': flat}, matrix, colour)

    def fin(self, colour, pts, thickness=0.02, matrix=Matrix()):
        """A flat fin from a polygon of (x, z) points in the x-z plane, given a little thickness along y."""
        front = [self.bm.verts.new(Vector((x, -thickness / 2, z))) for x, z in pts]
        back = [self.bm.verts.new(Vector((x, thickness / 2, z))) for x, z in pts]
        self.bm.faces.new(front[::-1])
        self.bm.faces.new(back)
        n = len(pts)
        for i in range(n):
            self.bm.faces.new((front[i], front[(i + 1) % n], back[(i + 1) % n], back[i]))
        return self._take({'verts': front + back}, matrix, colour)

    def save(self, name, path):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for p in mesh.polygons:
            p.use_smooth = False
        # Say which colours are the mesh's own, or the exporter writes a blank set first.
        mesh.color_attributes.active_color_name = 'Col'
        mesh.color_attributes.render_color_index = 0
        obj = bpy.data.objects.new(name, mesh)
        mat = bpy.data.materials.get('vc') or bpy.data.materials.new('vc')
        mesh.materials.append(mat)
        bpy.context.scene.collection.objects.link(obj)
        for o in bpy.context.scene.objects:
            o.select_set(o == obj)
        bpy.context.view_layer.objects.active = obj
        kwargs = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
        try:
            bpy.ops.export_scene.gltf(**kwargs, export_vertex_color='ACTIVE')
        except TypeError:
            bpy.ops.export_scene.gltf(**kwargs, export_colors=True)
        bpy.data.objects.remove(obj)
        bpy.data.meshes.remove(mesh)


def T(x=0, y=0, z=0):
    return Matrix.Translation((x, y, z))


def R(axis, deg):
    return Matrix.Rotation(math.radians(deg), 4, axis)


def S(x, y=None, z=None):
    return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1))


def clean():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes):
        bpy.data.meshes.remove(m)
