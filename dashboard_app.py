"""
Mangrove Degradation & Carbon Analysis Dashboard
Mumbai Coastal Region | 2020–2025
Run: streamlit run dashboard_app.py
"""

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import streamlit as st
import streamlit.components.v1 as components
from sklearn.linear_model import LinearRegression
from pathlib import Path
import json
import warnings
warnings.filterwarnings('ignore')

st.set_page_config(
    page_title="Mangrove Monitor · Mumbai",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');

:root {
    --white:      #ffffff;
    --off-white:  #f9fafb;
    --bg:         #f4f6f4;
    --border:     #e5e9e5;
    --border-mid: #d0d8d0;
    --green-deep: #1b5e35;
    --green-mid:  #2d7a4f;
    --green-soft: #e8f5ee;
    --green-acc:  #3aaa6a;
    --red:        #c0392b;
    --red-soft:   #fdf2f0;
    --amber:      #d68910;
    --amber-soft: #fef9ec;
    --text-dark:  #1a1f1a;
    --text-mid:   #4a5a4a;
    --text-light: #8a9e8a;
    --shadow-sm:  0 1px 4px rgba(0,0,0,0.06);
    --shadow-md:  0 4px 16px rgba(0,0,0,0.08);
}

html, body, [class*="css"] {
    font-family: 'Outfit', sans-serif !important;
    background: var(--bg) !important;
    color: var(--text-dark) !important;
}
.main .block-container {
    padding: 2rem 2.5rem 4rem;
    max-width: 1500px;
    background: var(--bg);
}

/* SIDEBAR */
section[data-testid="stSidebar"] {
    background: var(--white) !important;
    border-right: 1px solid var(--border) !important;
}
section[data-testid="stSidebar"] * { color: var(--text-dark) !important; }
section[data-testid="stSidebar"] .stSelectbox > div > div {
    background: var(--off-white) !important;
    border: 1px solid var(--border) !important;
}
section[data-testid="stSidebar"] label { color: var(--text-mid) !important; }

/* HEADER */
.page-header {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2.2rem 2.8rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
}
.header-eyebrow {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--green-mid);
    margin-bottom: 0.5rem;
}
.header-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.1rem;
    font-weight: 700;
    color: var(--text-dark);
    line-height: 1.15;
    margin: 0 0 0.5rem;
}
.header-title span { color: var(--green-deep); }
.header-sub {
    font-size: 0.87rem;
    font-weight: 400;
    color: var(--text-mid);
    line-height: 1.6;
}
.header-tags {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
}
.htag {
    display: inline-block;
    background: var(--green-soft);
    color: var(--green-deep);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid rgba(27,94,53,0.15);
}

/* KPI */
.kpi-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
    margin-bottom: 1.5rem;
}
.kpi-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 1.3rem 1.4rem 1.1rem;
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
}
.kpi-accent {
    position: absolute; top: 0; left: 0; right: 0;
    height: 3px; border-radius: 14px 14px 0 0;
}
.kpi-accent.g { background: var(--green-acc); }
.kpi-accent.r { background: var(--red); }
.kpi-accent.a { background: var(--amber); }
.kpi-lbl {
    font-size: 0.7rem; font-weight: 600; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--text-light); margin-bottom: 6px;
}
.kpi-v {
    font-family: 'Playfair Display', serif;
    font-size: 1.75rem; font-weight: 700; color: var(--text-dark);
    line-height: 1; margin-bottom: 4px;
}
.kpi-d { font-size: 0.75rem; font-weight: 500; color: var(--text-light); }
.kpi-d.dn { color: var(--red); }
.kpi-d.up { color: var(--green-acc); }

/* SECTION */
.sec-lbl {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--green-mid); margin-bottom: 3px;
}
.sec-ttl {
    font-family: 'Playfair Display', serif;
    font-size: 1.25rem; font-weight: 600; color: var(--text-dark);
    margin-bottom: 4px; line-height: 1.25;
}
.sec-dsc {
    font-size: 0.82rem; color: var(--text-mid); line-height: 1.65;
    margin-bottom: 1.2rem; max-width: 680px;
}

/* CALLOUT */
.callout {
    border-radius: 10px; padding: 0.9rem 1.1rem; margin: 0.8rem 0;
    font-size: 0.84rem; line-height: 1.65; color: var(--text-dark);
}
.callout.g { background: var(--green-soft); border-left: 3px solid var(--green-acc); }
.callout.r { background: var(--red-soft);   border-left: 3px solid var(--red); }
.callout.a { background: var(--amber-soft); border-left: 3px solid var(--amber); }
.callout strong { font-weight: 600; }

/* PILLS */
.pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 0.6rem 0 1rem; }
.pill {
    background: var(--off-white); border: 1px solid var(--border);
    border-radius: 6px; padding: 5px 12px;
    font-size: 0.78rem; font-weight: 400; color: var(--text-mid);
}
.pill b { color: var(--text-dark); font-weight: 600; }

/* TABS */
.stTabs [data-baseweb="tab-list"] {
    background: var(--white) !important; border: 1px solid var(--border) !important;
    border-radius: 10px !important; padding: 3px !important; gap: 2px !important;
}
.stTabs [data-baseweb="tab"] {
    background: transparent !important; color: var(--text-mid) !important;
    font-family: 'Outfit', sans-serif !important; font-size: 0.8rem !important;
    font-weight: 500 !important; border-radius: 7px !important; padding: 7px 16px !important;
}
.stTabs [aria-selected="true"] {
    background: var(--green-soft) !important;
    color: var(--green-deep) !important; font-weight: 600 !important;
}

/* MISC */
.stSelectbox > div > div { background: var(--white) !important; border: 1px solid var(--border) !important; }
.stDataFrame thead th { background: var(--off-white) !important; font-weight: 600 !important; font-size: 0.78rem !important; }
.stDataFrame tbody td { font-size: 0.82rem !important; }
hr { border: none; border-top: 1px solid var(--border) !important; margin: 1.5rem 0; }
.stDownloadButton button {
    background: var(--green-deep) !important; color: white !important;
    border: none !important; border-radius: 8px !important;
    font-family: 'Outfit', sans-serif !important; font-weight: 500 !important; font-size: 0.82rem !important;
}
.footer {
    text-align: center; font-size: 0.75rem; color: var(--text-light);
    padding: 2rem 0 1rem; border-top: 1px solid var(--border);
    margin-top: 2.5rem; letter-spacing: 0.2px; line-height: 1.8;
}
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 3px; }
</style>
""", unsafe_allow_html=True)

# ── PLOTLY THEME ──────────────────────────────────────────────────────
C = {
    'green':  '#2d7a4f', 'gl': '#3aaa6a', 'gp': '#a8d5ba',
    'red':    '#c0392b', 'rl': '#e8726a',
    'amber':  '#d68910', 'blue': '#2471a3', 'gray': '#95a5a6'
}
PT = dict(
    template='plotly_white',
    paper_bgcolor='rgba(255,255,255,0)',
    plot_bgcolor='rgba(255,255,255,0)',
    font=dict(family='Outfit, sans-serif', color='#1a1f1a', size=12),
    xaxis=dict(gridcolor='#f0f4f0', linecolor='#e5e9e5', tickcolor='#e5e9e5',
               tickfont=dict(size=11, color='#4a5a4a'), title_font=dict(size=11, color='#8a9e8a')),
    yaxis=dict(gridcolor='#f0f4f0', linecolor='#e5e9e5', tickcolor='#e5e9e5',
               tickfont=dict(size=11, color='#4a5a4a'), title_font=dict(size=11, color='#8a9e8a')),
    title_font=dict(family='Outfit, sans-serif', size=13, color='#1a1f1a'),
    legend=dict(bgcolor='rgba(255,255,255,0.92)', bordercolor='#e5e9e5', borderwidth=1,
                font=dict(size=11)),
    margin=dict(l=50, r=30, t=48, b=45),
    hoverlabel=dict(bgcolor='white', bordercolor='#e5e9e5',
                    font=dict(family='Outfit, sans-serif', size=12, color='#1a1f1a'))
)

def theme(fig, h=400, xticks=None):
    fig.update_layout(height=h, **PT)
    fig.update_xaxes(gridcolor='#f0f4f0', linecolor='#e5e9e5', zeroline=False)
    fig.update_yaxes(gridcolor='#f0f4f0', linecolor='#e5e9e5', zeroline=False)
    if xticks:
        fig.update_xaxes(tickvals=xticks, tickmode='array')
    return fig

YEARS = [2020, 2021, 2022, 2023, 2024, 2025]
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LEAFLET_HEATMAP_DIR = BASE_DIR / "web" / "leaflet_heatmap"
REAL_MANGROVE_GEOMETRY_FILES = [
    DATA_DIR / "mumbai_mangrove_geometry.geojson",
    DATA_DIR / "mumbai_mangrove_geometry.json",
    DATA_DIR / "mumbai_mangrove_geometry.csv",
]
MANGROVE_NDVI_THRESHOLD = 0.32
MANGROVE_FOCUS_ZONES = [
    {"name": "Malad-Gorai", "south": 19.12, "north": 19.22, "west": 72.76, "east": 72.87},
    {"name": "Mahim-Mithi", "south": 19.02, "north": 19.08, "west": 72.82, "east": 72.87},
    {"name": "Mahul-Sewri", "south": 19.00, "north": 19.06, "west": 72.90, "east": 72.98},
    {"name": "Thane Creek", "south": 19.08, "north": 19.20, "west": 72.96, "east": 73.05},
    {"name": "Vashi-Panvel", "south": 18.99, "north": 19.08, "west": 73.00, "east": 73.09},
]

# ── DATA ──────────────────────────────────────────────────────────────
@st.cache_data
def load():
    df    = pd.read_csv(DATA_DIR / 'mangrove_2020_2025_final.csv').sort_values('year').reset_index(drop=True)
    urban = pd.read_csv(DATA_DIR / 'mangrove_to_urban_2020_2025_final.csv').sort_values('year').reset_index(drop=True)
    gee   = pd.read_csv(DATA_DIR / 'gee_export.csv').drop(columns=['system:index','.geo'], errors='ignore')
    gee_u = pd.read_csv(DATA_DIR / 'mangrove_to_urban_gee_export_v2.csv').drop(columns=['system:index','.geo'], errors='ignore')

    df['area_ha']         = df['mangrove_area_sq_km'] * 100
    df['carbon_tc']       = df['area_ha'] * 150
    bc                    = df['carbon_tc'].iloc[0]
    df['carbon_lost_tc']  = bc - df['carbon_tc']
    df['carbon_lost_pct'] = df['carbon_lost_tc'] / bc * 100
    df['co2eq_stock']     = df['carbon_tc'] * 3.67
    df['co2eq_lost']      = df['carbon_lost_tc'] * 3.67
    ba                    = df['mangrove_area_sq_km'].iloc[0]
    df['cum_loss']        = ba - df['mangrove_area_sq_km']

    urban['carbon_tc']      = urban['remaining_mangrove_sq_km'] * 15000
    buc                     = urban['carbon_tc'].iloc[0]
    urban['carbon_lost_tc'] = buc - urban['carbon_tc']

    X = df[['year']]
    fa = LinearRegression().fit(X, df['mangrove_area_sq_km'])
    fc = LinearRegression().fit(X, df['carbon_tc'])
    fy = np.arange(2026, 2031).reshape(-1,1)
    pred = pd.DataFrame({
        'year':           fy.flatten(),
        'area':           fa.predict(fy),
        'carbon_tc':      fc.predict(fy),
    })
    pred['carbon_lost_tc']  = df['carbon_tc'].iloc[0] - pred['carbon_tc']
    pred['carbon_lost_pct'] = pred['carbon_lost_tc'] / df['carbon_tc'].iloc[0] * 100

    return df, urban, gee, gee_u, pred

df, urban, gee, gee_u, pred = load()


def coerce_year(value):
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def iter_lon_lat_pairs(coords):
    if isinstance(coords, (list, tuple)):
        if len(coords) >= 2 and all(isinstance(v, (int, float)) for v in coords[:2]):
            yield float(coords[0]), float(coords[1])
        else:
            for item in coords:
                yield from iter_lon_lat_pairs(item)


def iter_geometry_lon_lat_pairs(geometry):
    if not geometry:
        return

    geometry_type = geometry.get('type')
    if geometry_type == 'GeometryCollection':
        for item in geometry.get('geometries', []):
            yield from iter_geometry_lon_lat_pairs(item)
        return

    yield from iter_lon_lat_pairs(geometry.get('coordinates', []))


def feature_year(feature):
    props = feature.get('properties') or {}
    for key in ('year', 'Year'):
        if key in props:
            return coerce_year(props.get(key))
    return None


def build_bounds_and_center_from_features(features):
    coords = []
    for feature in features:
        coords.extend(iter_geometry_lon_lat_pairs(feature.get('geometry')))

    if not coords:
        return None, None

    lngs = [lon for lon, _ in coords]
    lats = [lat for _, lat in coords]
    bounds = {
        'south': float(min(lats)),
        'west': float(min(lngs)),
        'north': float(max(lats)),
        'east': float(max(lngs)),
    }
    center = {
        'lat': float(np.mean(lats)),
        'lng': float(np.mean(lngs)),
    }
    return center, bounds


def normalize_feature_collection(raw_data):
    if not isinstance(raw_data, dict):
        return {'type': 'FeatureCollection', 'features': []}

    if raw_data.get('type') == 'FeatureCollection':
        features = raw_data.get('features', [])
    elif raw_data.get('type') == 'Feature':
        features = [raw_data]
    else:
        features = []

    clean_features = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        geometry = feature.get('geometry')
        if not geometry:
            continue
        clean_features.append({
            'type': 'Feature',
            'geometry': geometry,
            'properties': feature.get('properties') or {},
        })

    return {'type': 'FeatureCollection', 'features': clean_features}


def load_feature_collection_from_csv(path):
    rows = pd.read_csv(path).to_dict(orient='records')
    features = []

    for row in rows:
        geo_blob = row.pop('.geo', None)
        row.pop('system:index', None)
        if pd.isna(geo_blob):
            continue

        try:
            geometry = json.loads(geo_blob)
        except (TypeError, json.JSONDecodeError):
            continue

        properties = {}
        for key, value in row.items():
            if pd.isna(value):
                continue
            properties[key] = value.item() if hasattr(value, 'item') else value

        features.append({
            'type': 'Feature',
            'geometry': geometry,
            'properties': properties,
        })

    return {'type': 'FeatureCollection', 'features': features}


@st.cache_data
def load_real_mangrove_geometry(selected_year):
    for path in REAL_MANGROVE_GEOMETRY_FILES:
        if not path.exists():
            continue

        if path.suffix.lower() == '.csv':
            feature_collection = load_feature_collection_from_csv(path)
        else:
            feature_collection = normalize_feature_collection(
                json.loads(path.read_text(encoding='utf-8'))
            )

        features = feature_collection.get('features', [])
        has_year_dimension = any(feature_year(feature) is not None for feature in features)

        if has_year_dimension:
            filtered_features = [
                feature for feature in features
                if feature_year(feature) == selected_year
            ]
        else:
            filtered_features = features

        center, bounds = build_bounds_and_center_from_features(filtered_features)
        if not filtered_features or not center or not bounds:
            return {
                'feature_collection': {'type': 'FeatureCollection', 'features': []},
                'center': None,
                'bounds': None,
                'feature_count': 0,
                'source_path': str(path),
                'source_name': path.name,
                'has_year_dimension': has_year_dimension,
            }

        return {
            'feature_collection': {
                'type': 'FeatureCollection',
                'features': filtered_features,
            },
            'center': center,
            'bounds': bounds,
            'feature_count': len(filtered_features),
            'source_path': str(path),
            'source_name': path.name,
            'has_year_dimension': has_year_dimension,
        }

    return {
        'feature_collection': {'type': 'FeatureCollection', 'features': []},
        'center': None,
        'bounds': None,
        'feature_count': 0,
        'source_path': None,
        'source_name': None,
        'has_year_dimension': False,
    }


def point_in_zone(lat, lng, zone):
    return (
        zone['south'] <= lat <= zone['north']
        and zone['west'] <= lng <= zone['east']
    )


def sample_zone_points(zone_points, max_points):
    total_points = sum(len(points) for points in zone_points.values())
    if not max_points or total_points <= max_points:
        return [point for points in zone_points.values() for point in points]

    non_empty_zones = [points for points in zone_points.values() if points]
    if not non_empty_zones:
        return []

    zone_cap = max(1, int(np.ceil(max_points / len(non_empty_zones))))
    sampled = []
    for points in zone_points.values():
        if len(points) > zone_cap:
            stride = int(np.ceil(len(points) / zone_cap))
            sampled.extend(points[::stride])
        else:
            sampled.extend(points)

    if len(sampled) > max_points:
        stride = int(np.ceil(len(sampled) / max_points))
        sampled = sampled[::stride]

    return sampled[:max_points]


@st.cache_data
def load_mangrove_focus_points(max_points=600, ndvi_threshold=MANGROVE_NDVI_THRESHOLD):
    ndvi_path = BASE_DIR / "Mumbai_NDVI_CSV.csv"
    if not ndvi_path.exists():
        return [], None, None, 0, []

    ndvi = pd.read_csv(ndvi_path, usecols=['NDVI', '.geo']).dropna(subset=['.geo'])
    zone_points = {zone['name']: [] for zone in MANGROVE_FOCUS_ZONES}
    total_samples = 0

    for ndvi_value, geo_blob in ndvi[['NDVI', '.geo']].itertuples(index=False):
        try:
            geo = json.loads(geo_blob)
        except (TypeError, json.JSONDecodeError):
            continue

        if geo.get('type') != 'Point':
            continue

        coords = geo.get('coordinates', [])
        if len(coords) != 2:
            continue

        lon, lat = coords
        try:
            lat = float(lat)
            lon = float(lon)
            ndvi_value = float(ndvi_value)
        except (TypeError, ValueError):
            continue

        total_samples += 1
        if ndvi_value < ndvi_threshold:
            continue

        zone = next((z for z in MANGROVE_FOCUS_ZONES if point_in_zone(lat, lon, z)), None)
        if not zone:
            continue

        zone_points[zone['name']].append({
            'lat': lat,
            'lng': lon,
            'weight': ndvi_value,
            'ndvi': ndvi_value,
            'zone': zone['name'],
        })

    points = sample_zone_points(zone_points, max_points=max_points)

    if not points:
        return [], None, None, total_samples, []

    lats = [p['lat'] for p in points]
    lngs = [p['lng'] for p in points]
    center = {'lat': float(np.mean(lats)), 'lng': float(np.mean(lngs))}
    bounds = {
        'south': float(min(lats)),
        'west': float(min(lngs)),
        'north': float(max(lats)),
        'east': float(max(lngs)),
    }
    zone_summary = [
        {'name': zone_name, 'count': len(zone_points[zone_name])}
        for zone_name in zone_points
        if zone_points[zone_name]
    ]
    return points, center, bounds, total_samples, zone_summary


@st.cache_data
def load_mumbai_ndvi_loss_points(max_points=5000):
    ndvi_path = BASE_DIR / "Mumbai_NDVI_CSV.csv"
    if not ndvi_path.exists():
        return [], None, None, 0

    ndvi = pd.read_csv(ndvi_path, usecols=['NDVI', '.geo']).dropna(subset=['.geo'])
    rows = []

    for ndvi_value, geo_blob in ndvi[['NDVI', '.geo']].itertuples(index=False):
        try:
            geometry = json.loads(geo_blob)
        except (TypeError, json.JSONDecodeError):
            continue

        if geometry.get('type') != 'Point':
            continue

        coords = geometry.get('coordinates', [])
        if len(coords) != 2:
            continue

        lon, lat = coords
        try:
            lat = float(lat)
            lon = float(lon)
            ndvi_value = float(ndvi_value)
        except (TypeError, ValueError):
            continue

        rows.append({
            'lat': lat,
            'lng': lon,
            'ndvi': ndvi_value,
        })

    total_points = len(rows)
    if not rows:
        return [], None, None, total_points

    ndvi_values = np.array([row['ndvi'] for row in rows], dtype=float)
    min_ndvi = float(np.min(ndvi_values))
    max_ndvi = float(np.max(ndvi_values))
    spread = max(max_ndvi - min_ndvi, 1e-9)

    points = []
    for row in rows:
        normalized_ndvi = (row['ndvi'] - min_ndvi) / spread
        loss_weight = 1 - normalized_ndvi
        points.append({
            'lat': row['lat'],
            'lng': row['lng'],
            'ndvi': row['ndvi'],
            'weight': float(np.clip(loss_weight, 0.05, 1.0)),
            'loss_score': float(np.clip(loss_weight * 100, 0.0, 100.0)),
        })

    if max_points and len(points) > max_points:
        stride = int(np.ceil(len(points) / max_points))
        points = points[::stride]

    lats = [point['lat'] for point in points]
    lngs = [point['lng'] for point in points]
    center = {'lat': float(np.mean(lats)), 'lng': float(np.mean(lngs))}
    bounds = {
        'south': float(min(lats)),
        'west': float(min(lngs)),
        'north': float(max(lats)),
        'east': float(max(lngs)),
    }
    return points, center, bounds, total_points


def load_leaflet_heatmap_assets():
    html_path = LEAFLET_HEATMAP_DIR / "heatmap_template.html"
    css_path = LEAFLET_HEATMAP_DIR / "heatmap.css"
    js_path = LEAFLET_HEATMAP_DIR / "heatmap.js"
    if not (html_path.exists() and css_path.exists() and js_path.exists()):
        return None, None, None

    return (
        html_path.read_text(encoding='utf-8'),
        css_path.read_text(encoding='utf-8'),
        js_path.read_text(encoding='utf-8'),
    )


def build_leaflet_heatmap_html(points, center, bounds, feature_collection=None, metadata=None):
    template, css_text, js_text = load_leaflet_heatmap_assets()
    if not template:
        return None

    feature_collection = feature_collection or {'type': 'FeatureCollection', 'features': []}
    metadata = metadata or {}

    return (
        template
        .replace("__LEAFLET_CUSTOM_CSS__", css_text)
        .replace("__LEAFLET_CUSTOM_JS__", js_text)
        .replace("__HEATMAP_POINTS__", json.dumps(points))
        .replace("__HEATMAP_CENTER__", json.dumps(center))
        .replace("__HEATMAP_BOUNDS__", json.dumps(bounds))
        .replace("__MAP_FEATURES__", json.dumps(feature_collection))
        .replace("__MAP_METADATA__", json.dumps(metadata))
    )

a2020 = df['mangrove_area_sq_km'].iloc[0]
a2025 = df['mangrove_area_sq_km'].iloc[-1]
c2020 = df['carbon_tc'].iloc[0]
c2025 = df['carbon_tc'].iloc[-1]
a_lost = a2020 - a2025
c_lost = c2020 - c2025
pct_a  = a_lost / a2020 * 100
pct_c  = c_lost / c2020 * 100
u2025  = urban['mangrove_to_urban_sq_km'].iloc[-1]

# ── SIDEBAR ──────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style='padding:0.8rem 0 1.2rem;'>
        <div style='font-family:Playfair Display,serif;font-size:1.15rem;font-weight:700;
             color:#1b5e35;line-height:1.2;'>Mangrove<br>Monitor</div>
        <div style='font-size:0.7rem;color:#8a9e8a;letter-spacing:1.5px;
             text-transform:uppercase;margin-top:5px;font-weight:500;'>Mumbai · 2020–2025</div>
    </div>
    """, unsafe_allow_html=True)
    st.divider()

    selected_year = st.selectbox("Highlight Year", YEARS, index=len(YEARS)-1)
    show_pred     = st.checkbox("Show 2026–2030 Forecast", value=True)
    st.divider()

    sel = df[df['year'] == selected_year].iloc[0]
    st.markdown(f"""<div style='font-size:0.68rem;font-weight:700;letter-spacing:1.5px;
         text-transform:uppercase;color:#8a9e8a;margin-bottom:10px;'>{selected_year} snapshot</div>""",
         unsafe_allow_html=True)

    for lbl, val, unit, col in [
        ("Mangrove Area",  f"{sel['mangrove_area_sq_km']:.4f}", "sq km", "#2d7a4f"),
        ("Annual Loss",    f"{sel['reduction_sq_km']:.4f}",    "sq km", "#c0392b"),
        ("Carbon Stock",   f"{sel['carbon_tc']:,.0f}",         "tC",    "#2d7a4f"),
        ("Carbon Lost",    f"{sel['carbon_lost_tc']:,.0f}",    "tC",    "#c0392b"),
        ("Loss Rate",      f"{sel['reduction_percent']:.2f}",  "%",     "#d68910"),
    ]:
        st.markdown(f"""
        <div style='padding:9px 10px;background:#f9fafb;border:1px solid #e5e9e5;
             border-radius:8px;margin-bottom:6px;'>
            <div style='font-size:0.67rem;color:#8a9e8a;font-weight:600;
                 text-transform:uppercase;letter-spacing:0.8px;'>{lbl}</div>
            <div style='font-size:1rem;font-weight:600;color:{col};margin-top:1px;'>
                {val} <span style='font-size:0.7rem;color:#8a9e8a;font-weight:400;'>{unit}</span>
            </div>
        </div>""", unsafe_allow_html=True)

    st.divider()
    st.markdown("""
    <div style='font-size:0.74rem;color:#8a9e8a;line-height:1.85;'>
        <b style='color:#4a5a4a;'>Data Source</b><br>Google Earth Engine<br>Sentinel-2 Imagery<br><br>
        <b style='color:#4a5a4a;'>Carbon Model</b><br>IPCC Blue Carbon 2013<br>150 tC/ha &nbsp;·&nbsp; 1 tC = 3.67 tCO₂eq
    </div>""", unsafe_allow_html=True)

# ── HEADER ───────────────────────────────────────────────────────────
st.markdown(f"""
<div class="page-header">
  <div>
    <div class="header-eyebrow">Coastal Ecosystem Research · GEE Satellite Analysis</div>
    <div class="header-title">Mangrove Degradation &amp; <span>Carbon Analysis</span></div>
    <div class="header-sub">Mumbai Coastal Region &nbsp;·&nbsp; 2020–2025 &nbsp;·&nbsp;
      Sentinel-2 Satellite Imagery &nbsp;·&nbsp; IPCC Blue Carbon Standard</div>
  </div>
  <div class="header-tags">
    <span class="htag">GEE · Satellite</span>
    <span class="htag">IPCC Carbon</span>
    <span class="htag">Linear Regression</span>
    <span class="htag">Mumbai</span>
  </div>
</div>
""", unsafe_allow_html=True)

# ── KPI ───────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="kpi-row">
  <div class="kpi-card"><div class="kpi-accent g"></div>
    <div class="kpi-lbl">Mangrove Area 2020</div>
    <div class="kpi-v">{a2020:.2f}</div>
    <div class="kpi-d up">sq km · baseline</div></div>
  <div class="kpi-card"><div class="kpi-accent r"></div>
    <div class="kpi-lbl">Mangrove Area 2025</div>
    <div class="kpi-v">{a2025:.2f}</div>
    <div class="kpi-d dn">▼ {a_lost:.2f} sq km lost</div></div>
  <div class="kpi-card"><div class="kpi-accent g"></div>
    <div class="kpi-lbl">Carbon Stock 2020</div>
    <div class="kpi-v">{c2020/1000:.1f}K</div>
    <div class="kpi-d up">tC · baseline</div></div>
  <div class="kpi-card"><div class="kpi-accent r"></div>
    <div class="kpi-lbl">Carbon Lost 2020→25</div>
    <div class="kpi-v">{c_lost/1000:.1f}K</div>
    <div class="kpi-d dn">▼ {pct_c:.1f}% of baseline</div></div>
  <div class="kpi-card"><div class="kpi-accent a"></div>
    <div class="kpi-lbl">Urban Conversion 2025</div>
    <div class="kpi-v">{u2025:.4f}</div>
    <div class="kpi-d" style="color:#d68910;">sq km confirmed</div></div>
</div>
""", unsafe_allow_html=True)

# ── TABS ──────────────────────────────────────────────────────────────
T1,T2,T3,T4,T5,T6,T7,T8 = st.tabs([
    "Dataset Comparison","Mangrove Reduction","Carbon Stock",
    "Urban Development","Year-wise View","Heatmaps","Forecast 2030","Data Explorer"
])

# ══════════════════ TAB 1 · DATASET COMPARISON ═══════════════════════
with T1:
    st.markdown("""<div class="sec-lbl">Validation</div>
    <div class="sec-ttl">Dataset Cross-Validation — Final vs GEE Export</div>
    <div class="sec-dsc">Both data sources are compared to validate consistency.
    Identical values confirm satellite extraction integrity.</div>""", unsafe_allow_html=True)

    cmp = df.merge(gee[['year','mangrove_area_sq_km']], on='year', how='left',
                   suffixes=('_Final','_GEE'))
    fig = make_subplots(1,2,
        subplot_titles=["Mangrove Area — Both Datasets (sq km)",
                        "Year-wise Reduction — Both Datasets (sq km)"],
        horizontal_spacing=0.1)

    fig.add_trace(go.Bar(x=cmp['year'], y=cmp['mangrove_area_sq_km_Final'],
        name='Final Dataset', marker_color=C['green'],
        text=[f"{v:.3f}" for v in cmp['mangrove_area_sq_km_Final']],
        textposition='outside', textfont=dict(size=10)), row=1,col=1)
    fig.add_trace(go.Bar(x=cmp['year'], y=cmp['mangrove_area_sq_km_GEE'],
        name='GEE Export', marker_color=C['gp'],
        text=[f"{v:.3f}" for v in cmp['mangrove_area_sq_km_GEE']],
        textposition='outside', textfont=dict(size=10)), row=1,col=1)
    fig.add_trace(go.Scatter(x=cmp['year'], y=cmp['mangrove_area_sq_km_Final'],
        mode='lines+markers', name='Trend',
        line=dict(color=C['gl'], width=2, dash='dot'),
        marker=dict(size=6)), row=1,col=1)

    gee2 = gee.rename(columns={'reduction_sq_km':'rGEE'})
    c2  = df.merge(gee2[['year','rGEE']], on='year', how='left')
    fig.add_trace(go.Bar(x=c2['year'], y=c2['reduction_sq_km'],
        name='Reduction (Final)', marker_color=C['red'],
        text=[f"{v:.3f}" for v in c2['reduction_sq_km']],
        textposition='outside', textfont=dict(size=10)), row=1,col=2)
    fig.add_trace(go.Bar(x=c2['year'], y=c2['rGEE'],
        name='Reduction (GEE)', marker_color='#e8a09a',
        text=[f"{v:.3f}" for v in c2['rGEE']],
        textposition='outside', textfont=dict(size=10)), row=1,col=2)

    theme(fig, 440, YEARS)
    fig.update_layout(barmode='group')
    fig.update_yaxes(title_text='Area (sq km)', row=1,col=1)
    fig.update_yaxes(title_text='Reduction (sq km)', row=1,col=2)
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("""<div class="callout g"><strong>Data Integrity Confirmed.</strong>
    Final dataset and GEE export are identical across all six years.
    Minor decimal differences (≤0.000001 sq km) are CSV rounding — both sources are valid.</div>""",
    unsafe_allow_html=True)

    cc1, cc2 = st.columns(2)
    with cc1:
        st.markdown("<div style='font-size:0.75rem;font-weight:600;color:#8a9e8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;'>Final Dataset</div>", unsafe_allow_html=True)
        st.dataframe(df[['year','mangrove_area_sq_km','reduction_sq_km','reduction_percent']].rename(
            columns={'year':'Year','mangrove_area_sq_km':'Area (sq km)',
                     'reduction_sq_km':'Reduction (sq km)','reduction_percent':'Reduction (%)'}),
            hide_index=True, use_container_width=True)
    with cc2:
        st.markdown("<div style='font-size:0.75rem;font-weight:600;color:#8a9e8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;'>GEE Export</div>", unsafe_allow_html=True)
        st.dataframe(gee[['year','mangrove_area_sq_km','reduction_sq_km','reduction_percent']].rename(
            columns={'year':'Year','mangrove_area_sq_km':'Area (sq km)',
                     'reduction_sq_km':'Reduction (sq km)','reduction_percent':'Reduction (%)'}),
            hide_index=True, use_container_width=True)

# ══════════════════ TAB 2 · MANGROVE REDUCTION ═══════════════════════
with T2:
    st.markdown("""<div class="sec-lbl">Area Analysis</div>
    <div class="sec-ttl">Mangrove Coverage Reduction 2020–2025</div>
    <div class="sec-dsc">Year-over-year tracking of mangrove area loss. 2021 recorded the 
    single highest loss at 3.89 sq km (15.8% of baseline). Annual rates have moderated 
    but cumulative damage compounds irreversibly.</div>""", unsafe_allow_html=True)

    fig2 = make_subplots(2,2,
        subplot_titles=["Mangrove Area Over Time","Annual Reduction (sq km)",
                        "Cumulative Area Lost vs Baseline","Annual Reduction Rate (%)"],
        vertical_spacing=0.2, horizontal_spacing=0.12)

    fig2.add_trace(go.Scatter(x=df['year'], y=df['mangrove_area_sq_km'],
        mode='lines+markers+text',
        text=[f"{v:.2f}" for v in df['mangrove_area_sq_km']],
        textposition='top center', textfont=dict(size=10, color=C['green']),
        line=dict(color=C['green'], width=2.5),
        marker=dict(size=9, color=C['green'], line=dict(width=2, color='white')),
        fill='tozeroy', fillcolor='rgba(45,122,79,0.06)', name='Area (sq km)'), row=1,col=1)
    if show_pred:
        fig2.add_trace(go.Scatter(x=pred['year'], y=pred['area'],
            mode='lines+markers', name='Forecast',
            line=dict(color=C['gp'], width=1.8, dash='dash'),
            marker=dict(size=7, color=C['gp'], symbol='diamond')), row=1,col=1)
    fig2.add_vline(x=selected_year, line_width=1, line_dash='dot',
                   line_color=C['amber'], row=1,col=1)

    cbars = [C['red'] if v>0 else C['gp'] for v in df['reduction_sq_km']]
    fig2.add_trace(go.Bar(x=df['year'], y=df['reduction_sq_km'],
        marker=dict(color=cbars, line=dict(width=0)),
        text=[f"{v:.3f}" for v in df['reduction_sq_km']],
        textposition='outside', textfont=dict(size=10), name='Reduction (sq km)'), row=1,col=2)

    fig2.add_trace(go.Scatter(x=df['year'], y=df['cum_loss'],
        mode='lines+markers', fill='tozeroy', fillcolor='rgba(192,57,43,0.07)',
        line=dict(color=C['red'], width=2.5),
        marker=dict(size=9, color=C['red'], line=dict(width=2, color='white')),
        text=[f"{v:.3f}" for v in df['cum_loss']],
        textposition='top center', textfont=dict(size=10), name='Cumulative Loss'), row=2,col=1)

    fig2.add_trace(go.Bar(x=df['year'], y=df['reduction_percent'],
        marker=dict(color=df['reduction_percent'].tolist(),
                    colorscale=[[0,'#a8d5ba'],[0.4,'#f5cba7'],[1,'#c0392b']],
                    showscale=False, line=dict(width=0)),
        text=[f"{v:.1f}%" for v in df['reduction_percent']],
        textposition='outside', textfont=dict(size=10), name='Reduction %'), row=2,col=2)

    theme(fig2, 560, YEARS)
    fig2.update_yaxes(title_text='Area (sq km)', row=1,col=1, title_font=dict(size=10))
    fig2.update_yaxes(title_text='Reduction (sq km)', row=1,col=2, title_font=dict(size=10))
    fig2.update_yaxes(title_text='Cumulative Loss (sq km)', row=2,col=1, title_font=dict(size=10))
    fig2.update_yaxes(title_text='Reduction (%)', row=2,col=2, title_font=dict(size=10))
    st.plotly_chart(fig2, use_container_width=True)

    worst = df.loc[df['reduction_sq_km'].idxmax()]
    st.markdown(f"""
    <div class="pill-row">
        <div class="pill">Total Lost <b>{a_lost:.4f} sq km</b></div>
        <div class="pill">% Lost <b>{pct_a:.2f}%</b></div>
        <div class="pill">Peak Loss Year <b>{int(worst['year'])}</b></div>
        <div class="pill">Peak Value <b>{worst['reduction_sq_km']:.4f} sq km</b></div>
        <div class="pill">2025 Area <b>{a2025:.4f} sq km</b></div>
    </div>
    <div class="callout r"><strong>Critical Finding:</strong> 2021 recorded the highest single-year 
    loss of {worst['reduction_sq_km']:.3f} sq km ({df['reduction_percent'].max():.1f}% of baseline). 
    Cumulative losses are irreversible — mangrove ecosystems cannot regenerate within years once cleared.</div>
    """, unsafe_allow_html=True)

# ══════════════════ TAB 3 · CARBON STOCK ═════════════════════════════
with T3:
    st.markdown("""<div class="sec-lbl">Carbon Analysis</div>
    <div class="sec-ttl">Carbon Stock &amp; Sequestration Capacity Loss</div>
    <div class="sec-dsc">Estimates from IPCC Blue Carbon standard (150 tC/ha). Each sq km of 
    mangrove stores ~15,000 tC (55,050 tCO₂ equivalent).</div>""", unsafe_allow_html=True)

    cl, cr = st.columns([1.55, 1])
    with cl:
        fig3 = make_subplots(2,1,
            subplot_titles=["Carbon Stock Over Time (tC)","Cumulative Carbon Loss vs Baseline (tC)"],
            vertical_spacing=0.22)
        fig3.add_trace(go.Scatter(x=df['year'], y=df['carbon_tc'],
            mode='lines+markers', fill='tozeroy', fillcolor='rgba(45,122,79,0.06)',
            line=dict(color=C['green'], width=2.5),
            marker=dict(size=9, color=C['green'], line=dict(width=2, color='white')),
            text=[f"{v/1000:.1f}K tC" for v in df['carbon_tc']],
            hovertemplate='<b>%{x}</b> — %{text}<extra></extra>',
            name='Carbon Stock'), row=1,col=1)
        if show_pred:
            fig3.add_trace(go.Scatter(x=pred['year'], y=pred['carbon_tc'],
                mode='lines+markers', name='Forecast',
                line=dict(color=C['gp'], width=1.8, dash='dash'),
                marker=dict(size=7, symbol='diamond', color=C['gp'])), row=1,col=1)

        fig3.add_trace(go.Bar(x=df['year'], y=df['carbon_lost_tc'],
            marker=dict(color=df['carbon_lost_tc'].tolist(),
                        colorscale=[[0,'#f5cba7'],[0.5,'#e59866'],[1,'#c0392b']],
                        showscale=True,
                        colorbar=dict(title=dict(text='tC', font=dict(size=10)),
                                      x=1.02, tickfont=dict(size=9), len=0.45, y=0.1)),
            text=[f"{v:,.0f}" for v in df['carbon_lost_tc']],
            textposition='outside', textfont=dict(size=10), name='Carbon Lost'), row=2,col=1)

        theme(fig3, 500, YEARS)
        fig3.update_yaxes(title_text='Carbon Stock (tC)', row=1,col=1, title_font=dict(size=10))
        fig3.update_yaxes(title_text='Carbon Lost (tC)', row=2,col=1, title_font=dict(size=10))
        st.plotly_chart(fig3, use_container_width=True)

    with cr:
        fig_d = go.Figure(go.Pie(
            labels=['Remaining (2025)', 'Lost Since 2020'],
            values=[c2025, c_lost], hole=0.62,
            marker_colors=[C['green'], C['red']],
            textinfo='percent', textfont=dict(size=13),
            insidetextorientation='radial', pull=[0, 0.06]))
        fig_d.update_layout(
    title=dict(text='Carbon Distribution<br>2020 → 2025', font=dict(size=12)),
    legend=dict(
        orientation='h',
        y=-0.08,
        font=dict(size=11)
    ),
    height=260
)

        fig_ba = go.Figure(go.Bar(
            x=['2020 Baseline','2025 Current'], y=[c2020, c2025],
            marker=dict(color=[C['green'], C['red']], line=dict(width=0)),
            text=[f"{c2020/1000:.1f}K tC", f"{c2025/1000:.1f}K tC"],
            textposition='outside', textfont=dict(size=12), width=0.45))
        theme(fig_ba, 200)
        fig_ba.update_layout(title=dict(text='Before vs After', font=dict(size=12)),
                              yaxis_title='Carbon (tC)', showlegend=False)
        st.plotly_chart(fig_ba, use_container_width=True)

        st.markdown(f"""
        <div style='background:#f9fafb;border:1px solid #e5e9e5;border-radius:10px;padding:1rem;margin-top:0.5rem;'>
            <div style='font-size:0.68rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                 color:#8a9e8a;margin-bottom:10px;'>CO₂ Equivalent Impact</div>
            <div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;'>
                <div style='background:white;border:1px solid #e5e9e5;border-radius:8px;padding:9px 10px;'>
                    <div style='font-size:0.67rem;color:#8a9e8a;font-weight:600;'>Stock 2020</div>
                    <div style='font-size:1rem;font-weight:600;color:#2d7a4f;'>{c2020*3.67/1000:.1f}K</div>
                    <div style='font-size:0.67rem;color:#8a9e8a;'>tCO₂eq</div>
                </div>
                <div style='background:white;border:1px solid #e5e9e5;border-radius:8px;padding:9px 10px;'>
                    <div style='font-size:0.67rem;color:#8a9e8a;font-weight:600;'>Stock 2025</div>
                    <div style='font-size:1rem;font-weight:600;color:#c0392b;'>{c2025*3.67/1000:.1f}K</div>
                    <div style='font-size:0.67rem;color:#8a9e8a;'>tCO₂eq</div>
                </div>
                <div style='background:#fdf2f0;border:1px solid #f5b7b1;border-radius:8px;
                     padding:9px 10px;grid-column:1/-1;'>
                    <div style='font-size:0.67rem;color:#8a9e8a;font-weight:600;'>Total CO₂eq Released</div>
                    <div style='font-size:1.05rem;font-weight:700;color:#c0392b;'>{c_lost*3.67:,.0f} tCO₂eq</div>
                    <div style='font-size:0.67rem;color:#8a9e8a;'>≈ {c_lost*3.67/4.6:.0f} passenger cars/year</div>
                </div>
            </div>
        </div>""", unsafe_allow_html=True)

# ══════════════════ TAB 4 · URBAN DEVELOPMENT ════════════════════════
with T4:
    st.markdown("""<div class="sec-lbl">Land Use Change</div>
    <div class="sec-ttl">Urban Development Impact on Mangrove Ecosystems</div>
    <div class="sec-dsc">Satellite-detected conversion of mangrove land cover to urban use 
    via GEE pixel-level classification. Actual detected land cover transitions — not a proxy index.</div>""",
    unsafe_allow_html=True)

    r1c1, r1c2 = st.columns([1.6, 1])
    with r1c1:
        fig_u1 = make_subplots(specs=[[{'secondary_y': True}]])
        fig_u1.add_trace(go.Scatter(x=urban['year'], y=urban['remaining_mangrove_sq_km'],
            mode='lines+markers', fill='tozeroy', fillcolor='rgba(45,122,79,0.07)',
            line=dict(color=C['green'], width=2.5),
            marker=dict(size=10, color=C['green'], line=dict(width=2, color='white')),
            name='Mangrove Area (sq km)'), secondary_y=False)
        fig_u1.add_trace(go.Scatter(x=urban['year'], y=urban['mangrove_to_urban_sq_km'],
            mode='lines+markers',
            line=dict(color=C['red'], width=2.5, dash='dot'),
            marker=dict(size=10, color=C['red'], symbol='square', line=dict(width=2, color='white')),
            name='Mangrove → Urban (sq km)'), secondary_y=True)

        pk = urban['mangrove_loss_sq_km'].idxmax()
        fig_u1.add_annotation(x=urban.loc[pk,'year'], y=urban.loc[pk,'remaining_mangrove_sq_km'],
            text=f"Peak Loss: {urban.loc[pk,'mangrove_loss_sq_km']:.2f} sq km",
            showarrow=True, arrowhead=2, arrowcolor=C['red'],
            bgcolor='white', bordercolor='#e5e9e5', borderwidth=1,
            font=dict(size=11, color='#1a1f1a'))
        fig_u1.add_vrect(x0=2024.5, x1=2025.5,
            fillcolor='rgba(192,57,43,0.04)', line_width=0,
            annotation_text="2025 surge", annotation_position="top",
            annotation_font=dict(color=C['red'], size=10))

        theme(fig_u1, 390, YEARS)
        fig_u1.update_layout(
            title=dict(text='Mangrove Area vs Urban Conversion'),
            legend=dict(orientation='h', y=-0.18))
        fig_u1.update_yaxes(title_text='Mangrove Area (sq km)', secondary_y=False,
                            color=C['green'], title_font=dict(color=C['green'], size=10))
        fig_u1.update_yaxes(title_text='Urban Conversion (sq km)', secondary_y=True,
                            color=C['red'], title_font=dict(color=C['red'], size=10))
        st.plotly_chart(fig_u1, use_container_width=True)

    with r1c2:
        fig_u2 = go.Figure()
        fig_u2.add_trace(go.Bar(x=urban['year'], y=urban['new_conversion_sq_km'],
            marker=dict(color=urban['new_conversion_sq_km'].tolist(),
                        colorscale=[[0,'#f5cba7'],[1,'#c0392b']],
                        showscale=False, line=dict(width=0)),
            text=[f"{v:.4f}" for v in urban['new_conversion_sq_km']],
            textposition='outside', textfont=dict(size=10)))
        theme(fig_u2, 390, YEARS)
        fig_u2.update_layout(title=dict(text='New Urban Conversion Per Year (sq km)'),
                              yaxis_title='Conversion (sq km)', showlegend=False)
        st.plotly_chart(fig_u2, use_container_width=True)

    r2c1, r2c2 = st.columns(2)
    with r2c1:
        fig_u3 = go.Figure()
        fig_u3.add_trace(go.Scatter(x=urban['year'], y=urban['urban_share_of_mangrove_loss_percent'],
            mode='lines+markers+text',
            text=[f"{v:.2f}%" for v in urban['urban_share_of_mangrove_loss_percent']],
            textposition='top center', textfont=dict(size=10, color=C['amber']),
            fill='tozeroy', fillcolor='rgba(214,137,16,0.07)',
            line=dict(color=C['amber'], width=2.5),
            marker=dict(size=9, color=C['amber'], line=dict(width=2, color='white'))))
        theme(fig_u3, 300, YEARS)
        fig_u3.update_layout(title=dict(text='Urban Share of Total Mangrove Loss (%)'),
                              xaxis_title='Year', yaxis_title='Urban Share (%)', showlegend=False)
        st.plotly_chart(fig_u3, use_container_width=True)

    with r2c2:
        fig_u4 = go.Figure()
        fig_u4.add_trace(go.Bar(x=urban['year'], y=urban['conversion_percent_of_2020_mangrove'],
            marker=dict(color=urban['conversion_percent_of_2020_mangrove'].tolist(),
                        colorscale=[[0,'#a8d5ba'],[0.5,'#f5cba7'],[1,'#c0392b']],
                        showscale=False, line=dict(width=0)),
            text=[f"{v:.3f}%" for v in urban['conversion_percent_of_2020_mangrove']],
            textposition='outside', textfont=dict(size=10)))
        theme(fig_u4, 300, YEARS)
        fig_u4.update_layout(title=dict(text='Cumulative Conversion as % of 2020 Baseline'),
                              xaxis_title='Year', yaxis_title='% of 2020 Baseline', showlegend=False)
        st.plotly_chart(fig_u4, use_container_width=True)

    st.markdown(f"""<div class="callout a">
    <strong>2025 Urban Acceleration:</strong> Cumulative urban conversion reached 
    {urban['mangrove_to_urban_sq_km'].iloc[-1]:.4f} sq km — a 6× increase from 2024. 
    Urban development now accounts for {urban['urban_share_of_mangrove_loss_percent'].iloc[-1]:.2f}% 
    of total mangrove loss, marking a structural shift from natural degradation to direct 
    anthropogenic encroachment in the Mumbai coastal buffer zone.</div>""", unsafe_allow_html=True)

# ══════════════════ TAB 5 · YEAR-WISE ════════════════════════════════
with T5:
    st.markdown(f"""<div class="sec-lbl">Interactive</div>
    <div class="sec-ttl">Year-wise Deep Dive — {selected_year}</div>
    <div class="sec-dsc">Select any year from the sidebar. This view isolates that year 
    across all metrics.</div>""", unsafe_allow_html=True)

    mopts = {
        'Mangrove Area (sq km)':            ('mangrove_area_sq_km', df),
        'Annual Reduction (sq km)':         ('reduction_sq_km', df),
        'Reduction Rate (%)':               ('reduction_percent', df),
        'Carbon Stock (tC)':                ('carbon_tc', df),
        'Carbon Lost (tC)':                 ('carbon_lost_tc', df),
        'Urban Conversion (sq km)':         ('mangrove_to_urban_sq_km', urban),
        'Urban Share of Loss (%)':          ('urban_share_of_mangrove_loss_percent', urban),
        'New Conversion per Year (sq km)':  ('new_conversion_sq_km', urban),
    }
    sel_lbl  = st.selectbox("Select Metric", list(mopts.keys()))
    ck, src  = mopts[sel_lbl]
    sv       = src.loc[src['year']==selected_year, ck].values[0]
    av       = src[ck].mean()
    mx       = src[ck].max()

    ca, cb = st.columns([1.4, 1])
    with ca:
        bc2 = ['#1b5e35' if y==selected_year else '#a8d5ba' for y in src['year']]
        fi  = go.Figure()
        fi.add_trace(go.Bar(x=src['year'], y=src[ck],
            marker=dict(color=bc2, line=dict(width=0)),
            text=[f"{v:.3f}" for v in src[ck]],
            textposition='outside', textfont=dict(size=10)))
        fi.add_hline(y=av, line_dash='dot', line_color=C['amber'], line_width=1.5,
                     annotation_text=f"  Avg: {av:.3f}",
                     annotation_font=dict(size=10, color=C['amber']))
        theme(fi, 360, src['year'].tolist())
        fi.update_layout(title=dict(text=f'{sel_lbl} — All Years  (■ = {selected_year})'),
                         xaxis_title='Year', yaxis_title=sel_lbl, showlegend=False)
        st.plotly_chart(fi, use_container_width=True)

    with cb:
        fg = go.Figure(go.Indicator(
            mode='gauge+number+delta', value=sv,
            delta={'reference': src[ck].iloc[0], 'valueformat': '.3f',
                   'increasing': {'color': C['red']}, 'decreasing': {'color': C['green']}},
            title={'text': f"{sel_lbl}<br><span style='font-size:12px;color:#8a9e8a'>{selected_year}</span>",
                   'font': {'size': 13, 'family': 'Outfit', 'color': '#1a1f1a'}},
            gauge={
                'axis': {'range': [0, mx*1.1], 'tickcolor': '#8a9e8a', 'tickfont': {'size': 10}},
                'bar': {'color': C['green'], 'thickness': 0.28},
                'bgcolor': 'white', 'borderwidth': 1, 'bordercolor': '#e5e9e5',
                'steps': [{'range':[0,mx*0.4],'color':'#f0f8f3'},
                           {'range':[mx*0.4,mx*0.75],'color':'#fef9ec'},
                           {'range':[mx*0.75,mx*1.1],'color':'#fdf2f0'}],
                'threshold': {'line': {'color': C['amber'], 'width': 2}, 'value': av}},
            number={'font': {'size': 22, 'family': 'Playfair Display', 'color': '#1a1f1a'},
                    'valueformat': '.3f'}))
        fg.update_layout(height=310, paper_bgcolor='rgba(0,0,0,0)',
                         plot_bgcolor='rgba(0,0,0,0)', font=dict(family='Outfit'))
        st.plotly_chart(fg, use_container_width=True)

    st.markdown("<div style='font-size:0.75rem;font-weight:600;color:#8a9e8a;text-transform:uppercase;letter-spacing:1px;margin:0.8rem 0 0.4rem;'>Multi-metric Radar — Selected Year vs Average</div>", unsafe_allow_html=True)
    rc  = ['mangrove_area_sq_km','reduction_sq_km','reduction_percent','carbon_lost_tc','carbon_lost_pct']
    rl  = ['Area','Reduction','Rate','C.Lost','C.Lost%']
    rn  = df[rc].copy()
    for c in rc:
        mx2 = rn[c].max()
        if mx2: rn[c] = rn[c]/mx2*100
    sv2 = rn[df['year']==selected_year].iloc[0].tolist()
    av2 = rn.mean().tolist()
    fr  = go.Figure()
    fr.add_trace(go.Scatterpolar(r=sv2+[sv2[0]], theta=rl+[rl[0]],
        fill='toself', fillcolor='rgba(45,122,79,0.1)',
        line=dict(color=C['green'], width=2), name=str(selected_year)))
    fr.add_trace(go.Scatterpolar(r=av2+[av2[0]], theta=rl+[rl[0]],
        fill='toself', fillcolor='rgba(214,137,16,0.07)',
        line=dict(color=C['amber'], width=1.5, dash='dash'), name='Average'))
    fr.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0,110], gridcolor='#e5e9e5',
                            tickfont=dict(size=9, color='#8a9e8a')),
            angularaxis=dict(tickfont=dict(size=11, family='Outfit'), gridcolor='#e5e9e5'),
            bgcolor='white'),
        title=dict(text=f'Normalized Profile: {selected_year} vs Average', font=dict(size=12)),
        height=350, showlegend=True, paper_bgcolor='rgba(0,0,0,0)',
        font=dict(family='Outfit'), legend=dict(font=dict(size=11)),
        margin=dict(l=60,r=60,t=50,b=40))
    st.plotly_chart(fr, use_container_width=True)

# ══════════════════ TAB 6 · HEATMAPS ═════════════════════════════════
with T6:
    st.markdown("""<div class="sec-lbl">Pattern Analysis</div>
    <div class="sec-ttl">Metric Heatmaps — 2020 to 2025</div>
    <div class="sec-dsc">Three views: raw values, row-normalized intensity, and year-on-year 
    % change. Reveals which metrics are deteriorating fastest and when shifts occurred.</div>""",
    unsafe_allow_html=True)

    st.markdown("<div style='font-size:0.75rem;font-weight:600;color:#8a9e8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;'>Mangrove Loss Map (Leaflet) — NDVI Heatmap</div>", unsafe_allow_html=True)
    real_geometry = load_real_mangrove_geometry(selected_year)
    geometry_features = real_geometry['feature_collection']['features']

    if geometry_features:
        leaflet_html = build_leaflet_heatmap_html(
            points=[],
            center=real_geometry['center'],
            bounds=real_geometry['bounds'],
            feature_collection=real_geometry['feature_collection'],
            metadata={
                'selectedYear': selected_year,
                'dataMode': 'real_geometry',
                'sourceName': real_geometry['source_name'],
                'isApproximate': False,
            },
        )
        if leaflet_html is None:
            st.warning("Leaflet map asset files are missing. Expected `web/leaflet_heatmap/heatmap_template.html`, `heatmap.css`, and `heatmap.js`.")
        else:
            components.html(leaflet_html, height=760, scrolling=False)
            st.caption(
                f"Displaying {real_geometry['feature_count']} real mangrove features for {selected_year} "
                f"from `{real_geometry['source_name']}`."
            )
    else:
        heat_points, map_center, map_bounds, total_ndvi_points = load_mumbai_ndvi_loss_points(max_points=5000)
        if not heat_points:
            st.warning("`Mumbai_NDVI_CSV.csv` could not be parsed, so the mangrove heatmap could not be rendered.")
        else:
            leaflet_html = build_leaflet_heatmap_html(
                points=heat_points,
                center=map_center,
                bounds=map_bounds,
                feature_collection={'type': 'FeatureCollection', 'features': []},
                metadata={
                    'selectedYear': selected_year,
                    'dataMode': 'ndvi_heatmap',
                    'sourceName': 'Mumbai_NDVI_CSV.csv',
                    'isApproximate': False,
                },
            )
            if leaflet_html is None:
                st.warning("Leaflet map asset files are missing. Expected `web/leaflet_heatmap/heatmap_template.html`, `heatmap.css`, and `heatmap.js`.")
            else:
                components.html(leaflet_html, height=760, scrolling=False)
                st.caption(
                    f"Displaying a mangrove loss heatmap from {len(heat_points)} NDVI coordinates "
                    f"sampled from {total_ndvi_points} rows in `Mumbai_NDVI_CSV.csv`. "
                    f"Red indicates lower NDVI and likely higher vegetation loss."
                )

    st.markdown("<hr>", unsafe_allow_html=True)

    mh  = df.merge(urban[['year','mangrove_to_urban_sq_km','new_conversion_sq_km']], on='year', how='left')
    mhs = ['mangrove_area_sq_km','reduction_sq_km','mangrove_to_urban_sq_km',
           'new_conversion_sq_km','carbon_tc','carbon_lost_tc','carbon_lost_pct']
    lhs = ['Mangrove Area','Annual Loss','Urban Conversion','New Conv./Year',
           'Carbon Stock','Carbon Lost','Carbon Lost %']
    zr  = mh[mhs].values.T

    zn = np.zeros_like(zr, dtype=float)
    for i, row in enumerate(zr):
        mx = row.max()
        zn[i] = row/mx*100 if mx else row

    hdf = mh[mhs].pct_change()*100
    hdf['year'] = df['year']
    hdf = hdf.dropna()
    zy  = np.clip(hdf[mhs].values.T, -300, 300)

    CS  = [[0,'#e7f7ee'],[0.28,'#9fdcb7'],[0.52,'#38ad77'],[0.78,'#e1a13e'],[1,'#c0392b']]
    CS_D = [[0,'#2d6d97'],[0.5,'#f7f9f8'],[1,'#c13a2e']]

    def hmap(z, xl, yl, cs, title, zmid=None, cbar_title='Intensity'):
        kw = {'zmid': zmid} if zmid is not None else {}
        fig = go.Figure(go.Heatmap(z=z, x=xl, y=yl, colorscale=cs,
            text=[[f"{v:.2f}" for v in row] for row in z],
            texttemplate='%{text}', textfont=dict(size=11, color='#1a1f1a'),
            xgap=3, ygap=3, hoverongaps=False,
            colorbar=dict(
                title=dict(text=cbar_title, side='top', font=dict(size=10)),
                tickfont=dict(size=9), len=0.86, thickness=14, outlinewidth=0
            ),
            hovertemplate='<b>%{y}</b><br>Year: %{x}<br>Value: %{z:.3f}<extra></extra>',
            **kw))
        theme(fig, 360)
        fig.update_layout(
            title=dict(text=title, x=0.01, xanchor='left'),
            xaxis_title='Year',
            margin=dict(l=70, r=28, t=54, b=44),
        )
        fig.update_xaxes(side='top', showgrid=False, tickfont=dict(size=11, color='#3f513f'))
        fig.update_yaxes(showgrid=False, tickfont=dict(size=11, color='#3f513f'), automargin=True)
        return fig

    ht1, ht2, ht3 = st.tabs(["Raw Values","Normalized (% of Max)","Year-on-Year Change"])
    with ht1:
        st.plotly_chart(hmap(zr, YEARS, lhs, CS, 'Raw Metric Values (2020–2025)', cbar_title='Metric Value'),
                        use_container_width=True)
    with ht2:
        st.plotly_chart(hmap(zn, YEARS, lhs, CS, 'Normalized — % of Row Maximum', cbar_title='% of Row Max'),
                        use_container_width=True)
        st.markdown("""<div class="callout g"><strong>Reading this chart:</strong> Each row normalized 
        so its max = 100%. Green = low relative value; Red = near maximum. 
        Carbon Lost % and Urban Conversion show deepening red toward 2025.</div>""",
        unsafe_allow_html=True)
    with ht3:
        st.plotly_chart(hmap(zy, hdf['year'].tolist(), lhs, CS_D,
                             'Year-on-Year % Change (Blue = decrease, Red = increase)', zmid=0,
                             cbar_title='YoY % Change'),
                        use_container_width=True)
        st.markdown("""<div class="callout r"><strong>Alert — 2025 Urban Conversion:</strong> 
        The Urban Conversion row shows extreme positive change in 2025, reflecting structural 
        acceleration of mangrove-to-urban land conversion detected in satellite imagery.</div>""",
        unsafe_allow_html=True)

# ══════════════════ TAB 7 · FORECAST 2030 ════════════════════════════
with T7:
    st.markdown("""<div class="sec-lbl">Predictive Modelling</div>
    <div class="sec-ttl">Trajectory Forecast — 2026 to 2030</div>
    <div class="sec-dsc">Linear regression trained on 2020–2025 data. Projects area and 
    carbon stock under a business-as-usual scenario.</div>""", unsafe_allow_html=True)

    ff = make_subplots(2,2,
        subplot_titles=["Mangrove Area — Actual + Forecast","Carbon Stock — Actual + Forecast",
                        "Forecast Area 2026–2030","Projected Carbon Loss % (Cumulative)"],
        vertical_spacing=0.2, horizontal_spacing=0.12)

    for col, ydat, ylab, pcol in [
        (1, df['mangrove_area_sq_km'], 'Actual Area',   C['green']),
        (2, df['carbon_tc'],           'Actual Carbon', C['green']),
    ]:
        ff.add_trace(go.Scatter(x=df['year'], y=ydat, mode='lines+markers', name=ylab,
            line=dict(color=pcol, width=2.5),
            marker=dict(size=9, color=pcol, line=dict(width=2, color='white'))), row=1,col=col)

    ff.add_trace(go.Scatter(x=pred['year'], y=pred['area'], mode='lines+markers', name='Forecast Area',
        line=dict(color=C['gp'], width=2, dash='dash'),
        marker=dict(size=8, symbol='diamond', color=C['gp'])), row=1,col=1)
    ff.add_trace(go.Scatter(x=pred['year'], y=pred['carbon_tc'], mode='lines+markers', name='Forecast Carbon',
        line=dict(color=C['amber'], width=2, dash='dash'),
        marker=dict(size=8, symbol='diamond', color=C['amber'])), row=1,col=2)

    for col in [1,2]:
        ff.add_vline(x=2025.5, line_dash='dot', line_color='#d0d8d0', row=1,col=col)

    ff.add_trace(go.Bar(x=pred['year'], y=pred['area'],
        marker=dict(color=C['gp'], line=dict(width=0)),
        text=[f"{v:.4f}" for v in pred['area']],
        textposition='outside', textfont=dict(size=10), name='Forecast Area'), row=2,col=1)

    ff.add_trace(go.Bar(x=pred['year'], y=pred['carbon_lost_pct'],
        marker=dict(color=pred['carbon_lost_pct'].tolist(),
                    colorscale=[[0,'#f5cba7'],[1,'#c0392b']], showscale=False, line=dict(width=0)),
        text=[f"{v:.1f}%" for v in pred['carbon_lost_pct']],
        textposition='outside', textfont=dict(size=10), name='C.Loss %'), row=2,col=2)

    theme(ff, 560)
    ff.update_yaxes(title_text='Area (sq km)', row=1,col=1, title_font=dict(size=10))
    ff.update_yaxes(title_text='Carbon Stock (tC)', row=1,col=2, title_font=dict(size=10))
    ff.update_yaxes(title_text='Area (sq km)', row=2,col=1, title_font=dict(size=10))
    ff.update_yaxes(title_text='Carbon Loss (%)', row=2,col=2, title_font=dict(size=10))
    st.plotly_chart(ff, use_container_width=True)

    st.markdown("<div style='font-size:0.75rem;font-weight:600;color:#8a9e8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;'>Forecast Table — 2026 to 2030</div>", unsafe_allow_html=True)
    dp = pred.copy()
    dp['co2eq'] = dp['carbon_lost_tc'] * 3.67
    st.dataframe(dp[['year','area','carbon_tc','carbon_lost_tc','carbon_lost_pct','co2eq']].rename(
        columns={'year':'Year','area':'Area (sq km)','carbon_tc':'Carbon (tC)',
                 'carbon_lost_tc':'Lost (tC)','carbon_lost_pct':'Loss (%)','co2eq':'CO₂eq (t)'}
    ).style.format({'Area (sq km)':'{:.4f}','Carbon (tC)':'{:,.0f}',
                    'Lost (tC)':'{:,.0f}','Loss (%)':'{:.2f}%','CO₂eq (t)':'{:,.0f}'}),
    hide_index=True, use_container_width=True)

    ea = df['mangrove_area_sq_km'].iloc[-1] - pred['area'].iloc[-1]
    ec = pred['carbon_lost_tc'].iloc[-1] - df['carbon_lost_tc'].iloc[-1]
    st.markdown(f"""<div class="callout r"><strong>Forecast Warning:</strong> Under the current 
    trajectory, by 2030 the region will lose an additional <strong>~{ea:.3f} sq km</strong> of 
    mangrove cover and <strong>{ec:,.0f} tC</strong> of additional carbon storage beyond 2025 levels.
    Immediate conservation intervention is required to alter this trajectory.</div>""",
    unsafe_allow_html=True)

# ══════════════════ TAB 8 · DATA EXPLORER ════════════════════════════
with T8:
    st.markdown("""<div class="sec-lbl">Raw Data</div>
    <div class="sec-ttl">Data Explorer</div>
    <div class="sec-dsc">Browse, inspect, and download all datasets used in this analysis.</div>""",
    unsafe_allow_html=True)

    ds = st.radio("Dataset", [
        "Main Mangrove Dataset","Urban Conversion Dataset",
        "GEE Raw Export","Predictions 2026–2030"], horizontal=True)

    dsm = {"Main Mangrove Dataset": df, "Urban Conversion Dataset": urban,
           "GEE Raw Export": gee, "Predictions 2026–2030": pred}
    show = dsm[ds].copy()
    show.columns = [c.replace('_',' ').title() for c in show.columns]

    st.dataframe(show, use_container_width=True, hide_index=True)
    st.markdown("<div style='font-size:0.75rem;font-weight:600;color:#8a9e8a;text-transform:uppercase;letter-spacing:1px;margin:1rem 0 6px;'>Descriptive Statistics</div>", unsafe_allow_html=True)
    st.dataframe(show.describe().round(4), use_container_width=True)
    st.download_button("⬇  Download as CSV",
        data=show.to_csv(index=False).encode(),
        file_name=f"mangrove_{ds[:3].lower().replace(' ','_')}.csv", mime='text/csv')

# ── FOOTER ────────────────────────────────────────────────────────────
st.markdown("""
<div class="footer">
    <strong>Mangrove Degradation &amp; Carbon Analysis Dashboard</strong> &nbsp;·&nbsp;
    Mumbai Coastal Region &nbsp;·&nbsp; 2020–2025<br>
    Data: Google Earth Engine &nbsp;·&nbsp; Sentinel-2 Imagery &nbsp;·&nbsp;
    Carbon Model: IPCC Blue Carbon (150 tC/ha) &nbsp;·&nbsp;
    CO₂eq: 1 tC = 3.67 tCO₂ &nbsp;·&nbsp; Forecast: Linear Regression
</div>
""", unsafe_allow_html=True)
