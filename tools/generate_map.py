"""Generate the Azeroth electoral map SVG (partials/azeroth-map.svg).

Usage (shapely is only needed here, not by the app):
    uv run --no-project --with shapely python tools/generate_map.py

Coastlines and zone seeds are traced (in reference-image pixels, 1477x1077) from
the WoW: Forever zone layout, then scaled into the SVG viewBox. Zones are
Voronoi cells (several seeds per zone, unioned) clipped to the coastline;
borders get a smooth position-based warp so neighbouring zones stay watertight.
"""
import math
from pathlib import Path
from shapely.geometry import Polygon, MultiPoint, Point, MultiPolygon
from shapely.ops import voronoi_diagram, unary_union, polylabel

W, H = 1000, 700
S, OX, OY = 0.65, 20, 0


def T(pts):
    return [(OX + x * S, OY + y * S) for x, y in pts]


def blob(cx, cy, rx, ry, n=16, wobble=0.12, seed=0.0):
    pts = []
    for i in range(n):
        a = i / n * 2 * math.pi
        k = 1 + wobble * math.sin(3 * a + seed) * math.cos(2 * a + 1.7 * seed)
        pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)))
    return pts


KALIMDOR = [
    (280, 195), (310, 185), (345, 172), (370, 175), (420, 165), (470, 170), (505, 195), (525, 230),
    (520, 275), (508, 315), (515, 330), (570, 330), (605, 345), (612, 390), (600, 420), (580, 425),
    (555, 420), (548, 440), (570, 460), (598, 480), (590, 500), (560, 500), (520, 495), (505, 500),
    (515, 560), (520, 610), (510, 640), (490, 655), (460, 660), (455, 675), (490, 690), (500, 720),
    (505, 760), (490, 800), (470, 820), (465, 840), (495, 870), (500, 920), (495, 960), (470, 990),
    (420, 1005), (370, 1005), (320, 1000), (290, 1000), (250, 990), (200, 980), (170, 950),
    (165, 900), (170, 870), (140, 865), (118, 830), (112, 780), (115, 730), (110, 690), (112, 640),
    (125, 600), (150, 580), (160, 540), (180, 500), (200, 470), (205, 440), (220, 420), (215, 380),
    (222, 300), (238, 240), (258, 210),
]
TELDRASSIL = [(200, 70), (230, 50), (270, 55), (290, 80), (285, 120), (265, 145), (240, 152), (215, 135), (195, 105)]
EASTERN_KINGDOMS = [
    (1005, 165), (1060, 148), (1120, 152), (1170, 152), (1210, 140), (1240, 125), (1250, 80),
    (1300, 70), (1350, 78), (1365, 110), (1370, 140), (1395, 175), (1400, 215), (1385, 260),
    (1380, 330), (1360, 365), (1340, 390), (1300, 400), (1280, 440), (1250, 452), (1232, 462),
    (1300, 470), (1340, 490), (1355, 530), (1345, 570), (1345, 630), (1355, 650), (1385, 680),
    (1410, 730), (1405, 800), (1380, 830), (1375, 880), (1360, 910), (1330, 935), (1300, 930),
    (1260, 905), (1240, 890), (1225, 930), (1210, 980), (1185, 1015), (1165, 1000), (1145, 960),
    (1125, 900), (1100, 880), (1060, 860), (1055, 800), (1070, 760), (1080, 715), (1110, 700),
    (1100, 680), (1070, 640), (1060, 600), (1070, 550), (1120, 530), (1160, 520), (1180, 470),
    (1210, 450), (1200, 420), (1180, 400), (1140, 390), (1090, 385), (1080, 410), (1070, 450),
    (1040, 470), (1000, 450), (990, 400), (1005, 360), (1000, 300), (1000, 230),
]
ZEPHRAS = blob(800, 137, 50, 38, seed=1)
SMALL_ISLES = [blob(530, 620, 8, 10, seed=2), blob(532, 695, 10, 13, seed=3),
               blob(95, 802, 9, 15, seed=4), blob(93, 845, 9, 12, seed=5)]

# (key, name, district or None, [seeds in reference px])
KAL_ZONES = [
    ("darkshore", "Darkshore", "TEL", [(250, 330), (245, 255), (245, 400)]),
    ("moonglade", "Moonglade", None, [(352, 222)]),
    ("felwood", "Felwood", None, [(315, 315), (312, 395)]),
    ("winterspring", "Winterspring", None, [(440, 245), (478, 300)]),
    ("hyjal", "Mount Hyjal", None, [(410, 372)]),
    ("azshara", "Azshara", None, [(565, 390), (525, 405)]),
    ("ashenvale", "Ashenvale", "ASH", [(250, 468), (315, 465), (420, 470)]),
    ("stonetalon", "Stonetalon", None, [(215, 540)]),
    ("barrens", "The Barrens", "BAR", [(370, 575), (400, 630), (372, 725)]),
    ("durotar", "Durotar", "DUR", [(485, 575), (482, 630)]),
    ("desolace", "Desolace", None, [(172, 655), (160, 725)]),
    ("shendralas", "Shen'dralas", None, [(236, 705)]),
    ("mulgore", "Mulgore", "MUL", [(300, 690)]),
    ("dustwallow", "Dustwallow", None, [(440, 705)]),
    ("feralas", "Feralas", None, [(160, 815), (245, 822)]),
    ("needles", "Thousand Needles", None, [(410, 800)]),
    ("silithus", "Silithus", "SIL", [(220, 918)]),
    ("ungoro", "Un'Goro", None, [(322, 930)]),
    ("tanaris", "Tanaris", "SIL", [(430, 925)]),
]
EK_ZONES = [
    ("tirisfal", "Tirisfal", "TIR", [(1050, 195), (1122, 198)]),
    ("silverpine", "Silverpine", "TIR", [(1040, 280), (1040, 350)]),
    ("gilneas", "Gilneas", None, [(1035, 425)]),
    ("wpl", "W. Plaguelands", None, [(1200, 188)]),
    ("epl", "E. Plaguelands", None, [(1312, 212)]),
    ("quelthalas", "Quel'Thalas", None, [(1305, 100)]),
    ("alterac", "Alterac", "ALT", [(1165, 268)]),
    ("hillsbrad", "Hillsbrad", "HIL", [(1110, 342), (1160, 340)]),
    ("hinterlands", "Hinterlands", None, [(1298, 300), (1350, 322)]),
    ("arathi", "Arathi", "ALT", [(1265, 405)]),
    ("wetlands", "Wetlands", None, [(1220, 500), (1290, 510)]),
    ("dunmorogh", "Dun Morogh", "DUN", [(1110, 598), (1165, 570)]),
    ("lochmodan", "Loch Modan", "DUN", [(1282, 592)]),
    ("searing", "Searing Gorge", None, [(1160, 640)]),
    ("badlands", "Badlands", None, [(1292, 662)]),
    ("burning", "Burning Steppes", None, [(1195, 690), (1262, 692)]),
    ("riverglades", "Riverglades", None, [(1362, 752)]),
    ("elwynn", "Elwynn", "ELW", [(1150, 760), (1195, 755)]),
    ("redridge", "Redridge", None, [(1270, 765)]),
    ("westfall", "Westfall", "ELW", [(1090, 820)]),
    ("duskwood", "Duskwood", None, [(1170, 835)]),
    ("deadwind", "Deadwind", None, [(1245, 842)]),
    ("swamp", "Swamp of Sorrows", None, [(1318, 845)]),
    ("blasted", "Blasted Lands", None, [(1305, 890)]),
    ("stv", "Stranglethorn", "STV", [(1180, 910), (1180, 972)]),
]
NEW_ZONES = {"Mount Hyjal", "Shen'dralas", "Riverglades"}
CLOSED_ZONES = {"Gilneas", "Quel'Thalas"}

DISTRICT_NAMES = {
    "TEL": "Teldrassil", "ASH": "Ashenvale", "DUR": "Durotar", "MUL": "Mulgore",
    "BAR": "Barrens", "SIL": "Silithus & Tanaris", "TIR": "Tirisfal", "HIL": "Hillsbrad",
    "ALT": "Alterac & Arathi", "DUN": "Dun Morogh", "ELW": "Elwynn", "STV": "Stranglethorn",
}
DISTRICT_EV = {"TEL": 3, "ASH": 4, "DUR": 3, "MUL": 3, "BAR": 4, "SIL": 3,
               "TIR": 3, "HIL": 5, "ALT": 4, "DUN": 3, "ELW": 4, "STV": 4}
LABEL_OVERRIDES = {}  # district -> (x, y) in viewBox units


def noise(x, y):
    """Smooth deterministic displacement, a function of position only."""
    dx = 1.8 * math.sin(0.11 * y + 1.3 * math.sin(0.047 * x)) + 0.7 * math.sin(0.31 * x + 0.23 * y)
    dy = 1.8 * math.sin(0.12 * x + 1.1 * math.sin(0.053 * y)) + 0.7 * math.sin(0.29 * y - 0.21 * x)
    return dx, dy


def warp_ring(coords, step):
    out = []
    pts = list(coords)
    for i in range(len(pts) - 1):
        (x1, y1), (x2, y2) = pts[i], pts[i + 1]
        n = max(1, int(math.hypot(x2 - x1, y2 - y1) / step))
        for k in range(n):
            t = k / n
            x, y = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
            dx, dy = noise(x, y)
            out.append((x + dx, y + dy))
    return out


def chaikin(pts, rounds=2):
    ring = list(pts) + [pts[0]]
    for _ in range(rounds):
        new = []
        for i in range(len(ring) - 1):
            (x1, y1), (x2, y2) = ring[i], ring[i + 1]
            new += [(0.75 * x1 + 0.25 * x2, 0.75 * y1 + 0.25 * y2), (0.25 * x1 + 0.75 * x2, 0.25 * y1 + 0.75 * y2)]
        ring = new + [new[0]]
    return ring


def coast(ref_pts):
    return Polygon(warp_ring(chaikin(T(ref_pts)), 3.0)).buffer(0)


def build(land, zones):
    seeds, owners = [], []
    for key, _, _, pts in zones:
        for p in T(pts):
            seeds.append(p)
            owners.append(key)
    cells = voronoi_diagram(MultiPoint(seeds), envelope=Polygon([(-50, -50), (W + 50, -50), (W + 50, H + 50), (-50, H + 50)]))
    by_key = {}
    for cell in cells.geoms:
        idx = next(i for i, s in enumerate(seeds) if cell.contains(Point(s)))
        by_key.setdefault(owners[idx], []).append(cell)
    result = {}
    for key, cs in by_key.items():
        merged = unary_union(cs)
        polys = merged.geoms if isinstance(merged, MultiPolygon) else [merged]
        warped = unary_union([Polygon(warp_ring(list(p.exterior.coords), 2.0)).buffer(0) for p in polys])
        result[key] = warped.intersection(land)
    # watertight: earlier zones win overlaps, slivers go to the nearest zone
    taken = None
    for key, _, _, _ in zones:
        g = result[key] if taken is None else result[key].difference(taken)
        result[key] = g
        taken = g if taken is None else unary_union([taken, g])
    gaps = land.difference(taken)
    for gp in (gaps.geoms if hasattr(gaps, "geoms") else [gaps]):
        if gp.is_empty or gp.geom_type != "Polygon":
            continue
        best = min(result, key=lambda k: result[k].distance(gp.representative_point()))
        result[best] = unary_union([result[best], gp])
    return result


def parts(geom):
    return [p for p in (geom.geoms if hasattr(geom, "geoms") else [geom]) if p.geom_type == "Polygon"]


def path_d(geom, min_area=3):
    d = []
    for p in parts(geom):
        if p.area < min_area:
            continue
        c = list(p.simplify(0.35, preserve_topology=True).exterior.coords)
        d.append("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in c[:-1]) + "Z")
    return "".join(d)


def label_point(geom):
    biggest = max(parts(geom), key=lambda p: p.area)
    return polylabel(biggest, tolerance=0.5)


def esc(s):
    return s.replace("&", "&amp;")


kal_land = coast(KALIMDOR)
tel_land = coast(TELDRASSIL)
ek_land = coast(EASTERN_KINGDOMS)
zephras = coast(ZEPHRAS)
isles = [coast(b) for b in SMALL_ISLES]

geo = {**build(kal_land, KAL_ZONES), **build(ek_land, EK_ZONES), "teldrassil": tel_land}
zones_all = [("teldrassil", "Teldrassil", "TEL", [])] + KAL_ZONES + EK_ZONES

districts, neutral = {}, []
for key, name, dist, _ in zones_all:
    if dist:
        districts.setdefault(dist, []).append(geo[key])
    else:
        neutral.append((name, geo[key]))


def kind(name):
    return "zone-new" if name in NEW_ZONES else ("zone-closed" if name in CLOSED_ZONES else "")


out = []
out.append("          <!-- Coastlines: shallow-water glow under the land -->")
for land in (kal_land, tel_land, ek_land, zephras, *isles):
    out.append(f'          <path class="map-coast" d="{path_d(land)}"/>')
out.append("")
out.append("          <!-- Zones without a voting district -->")
out.append('          <g class="map-neutral">')
for name, g in neutral:
    cls = kind(name)
    out.append(f'            <path d="{path_d(g)}"{f" class={chr(34)}{cls}{chr(34)}" if cls else ""}><title>{esc(name)}</title></path>')
out.append(f'            <path d="{path_d(zephras)}" class="zone-new zone-zephras"><title>Zephras Isle</title></path>')
for isle in isles:
    out.append(f'            <path d="{path_d(isle)}"/>')
out.append("          </g>")
labels = []
labels.append("")
labels.append('          <g class="map-neutral-labels">')
for name, g in neutral:
    p = label_point(g)
    cls = kind(name)
    labels.append(f'            <text x="{p.x:.0f}" y="{p.y + 3:.0f}"{f" class={chr(34)}{cls}{chr(34)}" if cls else ""}>{esc(name)}</text>')
zp = label_point(zephras)
labels.append(f'            <text x="{zp.x:.0f}" y="{zp.y + 3:.0f}" class="zone-new">Zephras Isle</text>')
labels.append("          </g>")
out.append("")
for dk in ["TEL", "ASH", "DUR", "MUL", "BAR", "SIL", "TIR", "HIL", "ALT", "DUN", "ELW", "STV"]:
    g = unary_union(districts[dk])
    if dk in LABEL_OVERRIDES:
        lx, ly = LABEL_OVERRIDES[dk]
    else:
        p = label_point(g)
        lx, ly = p.x, p.y - 2
    out.append(f'          <g id="zone-{dk}" class="map-zone" onclick="selectZone(\'{dk}\')">')
    out.append(f'            <path d="{path_d(g)}" class="zone-uncalled"/>')
    out.append(f'            <text x="{lx:.0f}" y="{ly:.0f}" class="zone-svg-label">{esc(DISTRICT_NAMES[dk].upper())}</text>')
    out.append(f'            <text x="{lx:.0f}" y="{ly + 12:.0f}" class="zone-svg-ev">{DISTRICT_EV[dk]} EV</text>')
    out.append("          </g>")
frag = "\n".join(out + labels)


def spiral(phase, turns=1.35, r0=6.0, r1=46.0, n=60):
    k = math.log(r1 / r0) / (turns * 2 * math.pi)
    pts = []
    for i in range(n + 1):
        th = i / n * turns * 2 * math.pi
        r = r0 * math.exp(k * th)
        pts.append((r * math.cos(th + phase), r * math.sin(th + phase)))
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)


arms_outer = "".join(f'<path d="{spiral(i * math.pi / 2)}"/>' for i in range(4))
arms_inner = "".join(f'<path d="{spiral(i * math.pi / 2 + math.pi / 4, turns=1.1, r1=30)}"/>' for i in range(4))
MX, MY = T([(755, 560)])[0]
GX, GY = T([(755, 455)])[0]
SSX, SSY = T([(750, 990)])[0]

svg = f"""<svg id="azeroth-svg" viewBox="50 0 910 {H}" class="azeroth-map-svg" role="img" aria-label="Electoral map of Kalimdor and the Eastern Kingdoms">
          <defs>
            <radialGradient id="maelstrom-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#021822" stop-opacity="1"/>
              <stop offset="18%" stop-color="#0b4a60" stop-opacity="0.9"/>
              <stop offset="55%" stop-color="#3fb6c4" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#3fb6c4" stop-opacity="0"/>
            </radialGradient>
            <pattern id="hatch-closed" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" class="hatch-bg"/>
              <line x1="0" y1="0" x2="0" y2="6" class="hatch-line"/>
            </pattern>
          </defs>

          <text x="{T([(1040, 100)])[0][0]:.0f}" y="{T([(1040, 100)])[0][1] + 5:.0f}" class="continent-header-text">EASTERN KINGDOMS</text>
          <text x="{T([(320, 1050)])[0][0]:.0f}" y="{T([(320, 1050)])[0][1]:.0f}" class="continent-header-text">KALIMDOR</text>
          <text x="{GX:.0f}" y="{GY:.0f}" class="sea-text">THE GREAT SEA</text>
          <text x="{SSX:.0f}" y="{SSY:.0f}" class="sea-text">THE SOUTH SEAS</text>
          <text x="{T([(22, 545)])[0][0]:.0f}" y="{T([(22, 545)])[0][1]:.0f}" class="sea-text" transform="rotate(-90 {T([(22, 545)])[0][0]:.0f} {T([(22, 545)])[0][1]:.0f})">THE VEILED SEA</text>

          <!-- The Maelstrom -->
          <g class="maelstrom" transform="translate({MX:.0f}, {MY:.0f})">
            <circle r="62" fill="url(#maelstrom-glow)"/>
            <g class="maelstrom-arms">
              <g class="arms-outer">{arms_outer}</g>
              <g class="arms-inner">{arms_inner}</g>
              <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="48s" repeatCount="indefinite"/>
            </g>
            <circle r="5" class="maelstrom-eye"/>
            <text y="76" class="sea-text">THE MAELSTROM</text>
          </g>

{frag}
        </svg>"""

# server.py inlines this partial into index.html at <!-- azeroth-map.svg -->
out_path = Path(__file__).resolve().parent.parent / "partials" / "azeroth-map.svg"
text = "\n".join(line[8:] if line.startswith(" " * 8) else line for line in svg.split("\n")) + "\n"
with open(out_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(text)
print(f"Wrote {out_path.relative_to(out_path.parent.parent)} ({len(text):,} bytes)")
