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
├── dashboard_app.py                 # Main Streamlit dashboard application
├── graphs_plotty.ipynb              # Jupyter notebook for plotting graphs
├── Mumbai_NDVI_CSV.csv              # NDVI data for Mumbai
├── README.md                        # Project documentation
├── satellite data.qgz               # QGIS project file for satellite data
├── data/                            # Directory for datasets
│   ├── gee_export.csv               # General Earth Engine export
│   ├── mangrove_2020_2025_final.csv # Final cleaned mangrove data (2020-2025)
│   ├── mangrove_to_urban_2020_2025_final.csv # Mangrove to urban conversion data
│   └── mangrove_to_urban_gee_export_v2.csv # Version 2 of mangrove to urban export
├── gee/                             # Google Earth Engine scripts
│   ├── mumbai_mangrove_analysis.js  # Script for Mumbai mangrove analysis
│   ├── mumbai_mangrove_to_urban_analysis.js # Script for mangrove to urban analysis
│   ├── mumbai_urban_growth_analysis.js # Script for urban growth analysis
│   └── thane_creek_mangrove_2020_2025.js # Script for Thane Creek mangrove analysis
└── scripts/                         # Python scripts for data cleaning
    ├── clean_mangrove_export.py     # Script to clean mangrove export data
    ├── clean_mangrove_to_urban_export.py # Script to clean mangrove to urban export
    └── clean_urban_export.py        # Script to clean urban export data
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
pip install streamlit pandas numpy plotly scikit-learn
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
- Run the command from the project root directory.

## SDG Alignment
- SDG 11: Sustainable Cities & Communities
- SDG 13: Climate Action
- SDG 15: Life on Land
