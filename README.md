# 🌿 GreenSetu: GIS-Based Mangrove Analysis System

The project focuses on understanding the environmental impact of rapid urbanization and supporting sustainable urban planning through data-driven insights.

## Objectives
- Analyze mangrove cover change from 2015 to 2025
- Estimate carbon stock reduction due to mangrove loss
- Compare mangrove decline with urban expansion
- Develop an interactive web-based dashboard

## Data Sources
- Global Mangrove Watch
- Government & environmental reports

## Project Structure
```
GreenSetu/
├── .streamlit/config.toml           # Streamlit deployment settings
├── .dockerignore                    # Docker build exclusions
├── Dockerfile                       # Container deployment for Render/Railway/VPS
├── Procfile                         # Process command for PaaS platforms
├── requirements.txt                 # Python dependencies for local/dev/prod
├── dashboard_app.py                 # Main Streamlit dashboard application
├── graphs_plotty.ipynb              # Jupyter notebook for plotting graphs
├── Mumbai_NDVI_CSV.csv              # NDVI data for Mumbai
├── README.md                        # Project documentation
├── satellite data.qgz               # QGIS project file for satellite data
├── data/                            # Directory for datasets
│   ├── gee_export.csv               # General Earth Engine export
│   ├── mangrove_2020_2025_final.csv # Final cleaned mangrove data (2020-2025)
│   ├── mangrove_to_urban_2020_2025_final.csv # Mangrove to urban conversion data
│   ├── mangrove_to_urban_gee_export_v2.csv # Version 2 of mangrove to urban export
│   └── mumbai_mangrove_geometry.geojson # Real mangrove geometry for map rendering (optional)
├── gee/                             # Google Earth Engine scripts
│   ├── mumbai_mangrove_analysis.js  # Script for Mumbai mangrove analysis
│   ├── mumbai_mangrove_geometry_export.js # Export real mangrove polygons for the dashboard
│   ├── mumbai_mangrove_to_urban_analysis.js # Script for mangrove to urban analysis
│   ├── mumbai_urban_growth_analysis.js # Script for urban growth analysis
│   └── thane_creek_mangrove_2020_2025.js # Script for Thane Creek mangrove analysis
└── scripts/                         # Python scripts for data cleaning
    ├── clean_mangrove_export.py     # Script to clean mangrove export data
    ├── clean_mangrove_to_urban_export.py # Script to clean mangrove to urban export
    ├── clean_urban_export.py        # Script to clean urban export data
    └── gee_table_to_geojson.py      # Convert GEE CSV geometry exports into GeoJSON
```

## How to Run
This project includes a Streamlit dashboard in `dashboard_app.py`.

### 1. Create and activate a virtual environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the dashboard
```bash
python3 -m streamlit run dashboard_app.py
```

### 4. Open it in your browser
After Streamlit starts, open the local URL shown in the terminal. It is usually:

```text
http://localhost:8501
```

### Notes
- The dashboard reads its datasets from the `data/` folder automatically.
- For the real mangrove map, place `mumbai_mangrove_geometry.geojson` or `mumbai_mangrove_geometry.csv` inside `data/`.
- Run the command from the project root directory.

## Deployment

### Recommended: Streamlit Community Cloud
This is the easiest option for this project because the app is already a single-file Streamlit dashboard and does not require secrets.

1. Push this repository to GitHub.
2. Create a new app in Streamlit Community Cloud.
3. Select this repository and branch.
4. Set the main file path to `dashboard_app.py`.
5. Deploy.

The platform will install packages from `requirements.txt` automatically.

### Docker Deployment
Use this for Render, Railway, a VM, or any container host.

Build the image:
```bash
docker build -t greensetu .
```

Run it locally:
```bash
docker run --rm -p 8501:8501 greensetu
```

The container starts Streamlit with:
```bash
streamlit run dashboard_app.py --server.address=0.0.0.0 --server.port=${PORT:-8501}
```

### Non-Docker PaaS Start Command
If your host asks for a start command, use:
```bash
streamlit run dashboard_app.py --server.address=0.0.0.0 --server.port=$PORT
```

## SDG Alignment
- SDG 11: Sustainable Cities & Communities
- SDG 13: Climate Action
- SDG 15: Life on Land
