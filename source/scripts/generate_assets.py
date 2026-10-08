"""
Solvane — procedural asset generator.

Every raster image used by the site is generated here from code (no stock imagery).
Run:  python scripts/generate_assets.py      (requires numpy + pillow)

Outputs (public/assets/...):
  textures/grain.png                 tileable film grain
  images/applications/*.webp         7 abstract industry artworks
  images/hero-fallback.png           static hero frame for browsers without WebGL
  images/molecular-field.png         static molecular scene for browsers without WebGL
  images/og-solvane.png              1200x630 social card
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")
IMG = os.path.join(ROOT, "images")
APP = os.path.join(IMG, "applications")
TEX = os.path.join(ROOT, "textures")
for d in (IMG, APP, TEX):
    os.makedirs(d, exist_ok=True)

BG = (7, 9, 13)
CYAN = (99, 211, 255)
BLUE = (142, 162, 255)
VIOLET = (195, 155, 255)
AMBER = (255, 184, 119)
STEEL = (170, 195, 225)


def canvas(w, h, ss=2, bg=BG):
    return Image.new("RGB", (w * ss, h * ss), bg), ss


def finish(img, ss, w, h):
    return img.resize((w, h), Image.LANCZOS)


def glow(img, radius, strength=1.0):
    """Additive bloom: blur the image and screen it over itself."""
    b = img.filter(ImageFilter.GaussianBlur(radius))
    a = np.asarray(img).astype(np.float32)
    bb = np.asarray(b).astype(np.float32) * strength
    out = 255 - (255 - a) * (255 - bb) / 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def vignette(img, amount=0.55):
    w, h = img.size
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
    m = 1 - amount * np.clip(d - 0.35, 0, 1.2) / 1.2
    a = np.asarray(img).astype(np.float32) * m[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def bg_gradient(w, h, c0=(10, 16, 28), c1=BG, cx=0.65, cy=0.35):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x / w - cx) / 0.8) ** 2 + ((y / h - cy) / 0.8) ** 2)
    t = np.clip(d, 0, 1)[..., None]
    a = np.array(c0, np.float32) * (1 - t) + np.array(c1, np.float32) * t
    return Image.fromarray(a.astype(np.uint8))


def mix(c, k, base=BG):
    return tuple(int(base[i] + (c[i] - base[i]) * k) for i in range(3))


# --------------------------------------------------------------------- grain
def grain():
    rng = np.random.default_rng(3)
    n = rng.normal(128, 38, (256, 256)).clip(0, 255).astype(np.uint8)
    Image.fromarray(n, "L").save(os.path.join(TEX, "grain.png"))


# --------------------------------------------------------------------- applications
W, H = 1000, 1250


def app_pharma():
    """Tablet cross-section: compressed granules with one highlighted impurity particle."""
    img = bg_gradient(W * 2, H * 2, (12, 18, 30))
    d = ImageDraw.Draw(img)
    cx, cy, R = W, H * 1.0, W * 0.78
    rnd = random.Random(1)
    circles = []
    for _ in range(9000):
        r = rnd.uniform(6, 34)
        a = rnd.uniform(0, math.tau)
        rr = math.sqrt(rnd.random()) * (R - r)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        if all((x - X) ** 2 + (y - Y) ** 2 > (r + Rr + 3) ** 2 for X, Y, Rr in circles[-400:]):
            circles.append((x, y, r))
    for x, y, r in circles:
        k = 0.18 + 0.5 * (1 - math.hypot(x - cx, y - cy) / R)
        d.ellipse([x - r, y - r, x + r, y + r], outline=mix(STEEL, k), width=2)
    d.ellipse([cx - R - 14, cy - R - 14, cx + R + 14, cy + R + 14], outline=mix(STEEL, 0.5), width=3)
    # highlighted particle
    hx, hy, hr = circles[len(circles) // 3]
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=AMBER)
    d.ellipse([hx - hr * 3, hy - hr * 3, hx + hr * 3, hy + hr * 3], outline=mix(AMBER, 0.6), width=2)
    img = glow(img, 18, 0.5)
    return vignette(img.resize((W, H), Image.LANCZOS))


def app_biotech():
    """Protein secondary structure: three helical ribbons drawn as dense strands with depth shading."""
    img = bg_gradient(W * 2, H * 2, (14, 14, 32))
    d = ImageDraw.Draw(img)
    helices = [
        (W * 0.75, -0.05, 1.05, 330, 5.5, 0.0, VIOLET),
        (W * 1.45, 0.25, 1.15, 210, 4.0, 1.3, BLUE),
        (W * 0.3, 0.45, 1.1, 160, 3.2, 2.1, CYAN),
    ]
    for cx, y0, y1, Rx, turns, ph, color in helices:
        for s_i in range(36):
            off = s_i / 35 - 0.5
            prev = None
            for i in range(900):
                t = i / 899
                ang = t * math.tau * turns + ph
                x = cx + math.sin(ang) * Rx
                z = math.cos(ang)
                y = H * 2 * (y0 + (y1 - y0) * t) + off * Rx * 0.42 * (0.35 + 0.65 * abs(z))
                if prev:
                    k = 0.08 + 0.5 * (z + 1) / 2
                    d.line([prev[0], prev[1], x, y], fill=mix(color, k), width=2)
                prev = (x, y)
    img = glow(img, 20, 0.55)
    return vignette(img.resize((W, H), Image.LANCZOS))


def app_environment():
    """Interference contours on a water surface — concentric sources, thin isolines."""
    w, h = W, H
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    srcs = [(0.3, 0.35, 1.0), (0.72, 0.6, 0.8), (0.45, 0.85, 0.6)]
    f = np.zeros_like(x)
    for sx, sy, a in srcs:
        r = np.sqrt((x - sx * w) ** 2 + (y - sy * h) ** 2)
        f += a * np.sin(r / 18.0) / (1 + r / 500)
    lines = np.exp(-((np.mod(f * 3.0, 1.0) - 0.5) ** 2) / 0.0025)
    base = np.asarray(bg_gradient(w, h, (8, 20, 30), cx=0.4, cy=0.5)).astype(np.float32)
    col = np.array(CYAN, np.float32)
    fade = (0.25 + 0.75 * np.clip(1 - np.abs(f) / 2.2, 0, 1))[..., None]
    out = base + lines[..., None] * col * 0.55 * fade
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    img = glow(img, 6, 0.4)
    return vignette(img)


def app_food():
    """Emulsion: droplets of many sizes under warm side-light."""
    img = bg_gradient(W * 2, H * 2, (26, 18, 12), cx=0.3, cy=0.3)
    d = ImageDraw.Draw(img, "RGBA")
    rnd = random.Random(4)
    drops = []
    for _ in range(4000):
        r = rnd.choice([rnd.uniform(6, 20), rnd.uniform(20, 60), rnd.uniform(60, 170)])
        x, y = rnd.uniform(0, W * 2), rnd.uniform(0, H * 2)
        if all((x - X) ** 2 + (y - Y) ** 2 > (r + R + 4) ** 2 for X, Y, R in drops):
            drops.append((x, y, r))
        if len(drops) > 420:
            break
    for x, y, r in drops:
        d.ellipse([x - r, y - r, x + r, y + r], outline=(*mix(AMBER, 0.55), 255), width=3)
        # specular highlight toward the light (upper-left)
        hr = r * 0.28
        d.ellipse([x - r * 0.45 - hr, y - r * 0.45 - hr, x - r * 0.45 + hr, y - r * 0.45 + hr], fill=(255, 230, 200, 70))
    img = glow(img, 16, 0.55)
    return vignette(img.resize((W, H), Image.LANCZOS))


def app_semi():
    """Wafer map: die grid inside a circular wafer, a single flagged die."""
    img = bg_gradient(W * 2, H * 2, (10, 16, 26))
    d = ImageDraw.Draw(img)
    cx, cy, R = W, H, W * 0.82
    die = 58
    rnd = random.Random(8)
    flagged = None
    for i in range(-20, 21):
        for j in range(-20, 21):
            x0, y0 = cx + i * die, cy + j * die
            corners = [(x0, y0), (x0 + die, y0), (x0, y0 + die), (x0 + die, y0 + die)]
            if all(math.hypot(px - cx, py - cy) < R for px, py in corners):
                k = 0.2 + 0.25 * rnd.random()
                d.rectangle([x0 + 4, y0 + 4, x0 + die - 4, y0 + die - 4], outline=mix(STEEL, k), width=2)
                # fine internal circuitry
                for t in range(3):
                    yy = y0 + 14 + t * 12
                    d.line([x0 + 12, yy, x0 + die - 12, yy], fill=mix(STEEL, k * 0.6), width=1)
                if i == 4 and j == -3:
                    flagged = (x0, y0)
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=mix(STEEL, 0.55), width=3)
    d.line([cx - 60, cy + R - 2, cx + 60, cy + R - 2], fill=BG, width=10)  # wafer notch
    if flagged:
        x0, y0 = flagged
        d.rectangle([x0 + 4, y0 + 4, x0 + die - 4, y0 + die - 4], fill=mix(CYAN, 0.9))
        d.rectangle([x0 - 40, y0 - 40, x0 + die + 40, y0 + die + 40], outline=mix(CYAN, 0.6), width=2)
    img = glow(img, 16, 0.5)
    return vignette(img.resize((W, H), Image.LANCZOS))


def app_energy():
    """Layered electrode lattice with ion trajectories between the layers."""
    img = bg_gradient(W * 2, H * 2, (12, 16, 30))
    d = ImageDraw.Draw(img)
    rnd = random.Random(12)
    layers = 9
    for L in range(layers):
        y = H * 2 * (0.1 + 0.8 * L / (layers - 1))
        for k in range(0, W * 2, 26):
            off = 13 if L % 2 else 0
            d.ellipse([k + off - 5, y - 5, k + off + 5, y + 5], fill=mix(STEEL, 0.32))
    for _ in range(140):
        L = rnd.randrange(layers - 1)
        y0 = H * 2 * (0.1 + 0.8 * L / (layers - 1))
        y1 = H * 2 * (0.1 + 0.8 * (L + 1) / (layers - 1))
        x = rnd.uniform(0, W * 2)
        pts = []
        for i in range(40):
            t = i / 39
            pts.append((x + math.sin(t * math.pi) * rnd.uniform(-1, 1) * 30 + t * 60, y0 + (y1 - y0) * t))
        col = mix(CYAN if rnd.random() > 0.3 else AMBER, rnd.uniform(0.35, 0.8))
        d.line(pts, fill=col, width=2)
        d.ellipse([pts[-1][0] - 6, pts[-1][1] - 6, pts[-1][0] + 6, pts[-1][1] + 6], fill=col)
    img = glow(img, 18, 0.6)
    return vignette(img.resize((W, H), Image.LANCZOS))


def app_materials():
    """Polycrystalline grain structure (Voronoi) in cross-polarised tones."""
    w, h = W, H
    rng = np.random.default_rng(21)
    n = 160
    pts = rng.random((n, 2)) * [w, h]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    best = np.full((h, w), 1e9, np.float32)
    second = np.full((h, w), 1e9, np.float32)
    idx = np.zeros((h, w), np.int32)
    for i, (px, py) in enumerate(pts):
        dd = (x - px) ** 2 + (y - py) ** 2
        m = dd < best
        second = np.where(m, best, np.minimum(second, dd))
        best = np.where(m, dd, best)
        idx = np.where(m, i, idx)
    edge = np.sqrt(second) - np.sqrt(best)
    hue = rng.random(n)
    pal = np.array([BLUE, VIOLET, CYAN, STEEL, AMBER], np.float32)
    cols = pal[(hue * 4.999).astype(int)] * (0.03 + 0.09 * rng.random((n, 1)))
    base = cols[idx] + 6
    # soft radial light so grains catch light toward the centre
    light = np.exp(-(((x / w - 0.6) ** 2) + ((y / h - 0.4) ** 2)) / 0.18)[..., None]
    base = base * (0.6 + 1.2 * light)
    line = np.exp(-(edge ** 2) / 4.0)[..., None] * np.array(STEEL, np.float32) * 0.55
    out = base + line
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    img = glow(img, 8, 0.35)
    return vignette(img)


# --------------------------------------------------------------------- hero fallback
def hero_fallback():
    w, h = 1920, 1080
    img = bg_gradient(w * 2, h * 2, (12, 20, 36), cx=0.6, cy=0.45)
    d = ImageDraw.Draw(img)
    s = 2
    x0, x1, cy = 520 * s, 1640 * s, 620 * s
    r = 36 * s
    d.rounded_rectangle([x0, cy - r, x1, cy + r], radius=8 * s, outline=mix(STEEL, 0.55), width=3)
    rnd = random.Random(2)
    ks = [0.6, 1.4, 2.4, 3.8]
    cols = [CYAN, BLUE, VIOLET, AMBER]
    for i in range(5000):
        p = i % 4
        v = 1 / (1 + ks[p])
        c = 0.12 + 0.82 * v
        sig = 0.02 + 0.03 * math.sqrt(c)
        xn = c + rnd.gauss(0, sig)
        if xn > 1:
            continue
        x = x0 + xn * (x1 - x0)
        y = cy + rnd.uniform(-r * 0.8, r * 0.8)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=mix(cols[p], 0.85))
    # chromatogram above
    base = 380 * s
    pts = []
    for i in range(1200):
        t = i / 1199
        yv = sum(a * math.exp(-((t - m) ** 2) / (2 * sd * sd)) for a, m, sd in [(1, 0.25, 0.012), (0.8, 0.42, 0.016), (1.1, 0.62, 0.02), (0.7, 0.85, 0.026)])
        pts.append((x0 + t * (x1 - x0), base - yv * 200 * s))
    d.line(pts, fill=(230, 238, 247), width=3)
    d.line([x0, base, x1, base], fill=mix(STEEL, 0.35), width=2)
    img = glow(img, 20, 0.55)
    finish(vignette(img), s, w, h).save(os.path.join(IMG, "hero-fallback.png"), optimize=True)


def molecular_field():
    w, h = 1920, 1080
    img = bg_gradient(w, h, (10, 14, 24), cx=0.65, cy=0.5)
    d = ImageDraw.Draw(img)
    rnd = random.Random(9)
    for _ in range(90):
        cx, cy = rnd.uniform(0, w), rnd.uniform(0, h)
        sc = rnd.uniform(6, 16)
        k = rnd.uniform(0.12, 0.35)
        pts = [(cx + math.cos(a) * sc * 1.4, cy + math.sin(a) * sc * 1.4) for a in [i * math.pi / 3 for i in range(6)]]
        d.line(pts + [pts[0]], fill=mix(STEEL, k), width=2)
        for p in pts:
            d.ellipse([p[0] - sc * 0.35, p[1] - sc * 0.35, p[0] + sc * 0.35, p[1] + sc * 0.35], fill=mix(STEEL, k + 0.05))
    img = glow(img, 6, 0.4)
    vignette(img).save(os.path.join(IMG, "molecular-field.png"), optimize=True)


def og():
    w, h = 1200, 630
    img = bg_gradient(w * 2, h * 2, (12, 20, 36), cx=0.7, cy=0.4)
    d = ImageDraw.Draw(img)
    s = 2
    base = 470 * s
    pts = []
    for i in range(1000):
        t = i / 999
        yv = sum(a * math.exp(-((t - m) ** 2) / (2 * sd * sd)) for a, m, sd in [(0.9, 0.52, 0.012), (0.7, 0.64, 0.015), (1.0, 0.78, 0.018), (0.6, 0.92, 0.022)])
        pts.append((t * w * s, base - yv * 230 * s))
    d.line(pts, fill=(230, 238, 247), width=4)
    d.line([0, base, w * s, base], fill=mix(STEEL, 0.3), width=2)
    img = glow(img, 18, 0.6)
    img = img.resize((w, h), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 64)
        small = ImageFont.truetype("DejaVuSansMono.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
        small = ImageFont.load_default()
    d.text((72, 120), "From complexity,", font=font, fill=(233, 238, 244))
    d.text((72, 196), "clarity.", font=font, fill=(159, 220, 255))
    d.text((72, 72), "SOLVANE  ·  ANALYTICAL SCIENCES", font=small, fill=(133, 146, 163))
    img.save(os.path.join(IMG, "og-solvane.png"), optimize=True)


if __name__ == "__main__":
    grain()
    apps = {
        "pharmaceuticals": app_pharma,
        "biotechnology": app_biotech,
        "environmental": app_environment,
        "food-beverage": app_food,
        "semiconductors": app_semi,
        "energy": app_energy,
        "advanced-materials": app_materials,
    }
    for name, fn in apps.items():
        fn().save(os.path.join(APP, f"{name}.webp"), quality=84, method=6)
        print("wrote", name)
    hero_fallback()
    molecular_field()
    og()
    print("done")
