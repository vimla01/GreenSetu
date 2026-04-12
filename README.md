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
- `gee/mumbai_mangrove_analysis.js`: current Earth Engine script for Mumbai region analysis
- `gee/mumbai_mangrove_to_urban_analysis.js`: Earth Engine script for mangrove areas converted to urban land
- `gee/mumbai_urban_growth_analysis.js`: optional Earth Engine script for total year-wise urban development extraction
- `gee/thane_creek_mangrove_2020_2025.js`: backup asset-based script for a narrower AOI workflow
- `scripts/clean_mangrove_export.py`: cleans Earth Engine export into final CSV
- `scripts/clean_mangrove_to_urban_export.py`: cleans the mangrove-to-urban export into final CSV
- `scripts/clean_urban_export.py`: cleans the urban growth export into final CSV
- `data/`: exported and cleaned datasets

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
