<div align="center">
  <br />
  <h1>🌍 UHI Detection & Mitigation System (v2.1)</h1>
  <p>
    <strong>Advanced Machine Learning & Geospatial Analytics for Urban Heat Island Detection</strong>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/FastAPI-005571?logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Earth_Engine-Google-4285F4?logo=google-earth" alt="Earth Engine" />
    <img src="https://img.shields.io/badge/Machine%20Learning-XGBoost-orange.svg" alt="XGBoost" />
    <img src="https://img.shields.io/badge/Accuracy-93.5%25-brightgreen.svg" alt="Accuracy" />
  </p>
</div>

<br />

## 📖 Overview

The **UHI Detection and Mitigation System** is a state-of-the-art platform that leverages global climate data, satellite imagery (Google Earth Engine), and Explainable AI (XAI) to map, predict, and mitigate Urban Heat Islands (UHI) with unprecedented accuracy.

By transitioning from a simple threshold-based heuristic to a sophisticated machine learning pipeline utilizing XGBoost and Random Forest algorithms, the v2.1 system achieves a massive **93.49% classification accuracy** and models thermal signatures dynamically across 60 global cities.

---

## ✨ Key Features

- 🛰️ **Geospatial Data Processing**: Real-time integration with Google Earth Engine API, utilizing Sentinel-2 and Landsat data.
- 🧠 **High-Precision ML Pipeline**: Powered by XGBoost and Scikit-Learn, featuring rigorous spatial cross-validation (GroupKFold) to prevent location memorization.
- 📊 **Explainable AI (XAI)**: Integrated `shap.TreeExplainer` providing local log-odds contributions (SHAP values) for every inference, rendering dynamic waterfall charts on the frontend.
- 🌐 **Immersive 3D Visualization**: An interactive, 3D globe and spatial dashboard built with React, Three.js, React Globe.gl, and ECharts.
- 📐 **Micro-Climate Accounting**: Incorporates advanced indices including EVI (dense urban canopies), NASA SRTM (altitudinal lapse rates), and NOAA VIIRS (anthropogenic heat/Nighttime Lights).

---

## 🏗️ Architecture & Tech Stack

### 🎨 Frontend (Client)
A high-performance, visually rich dashboard for real-time inference and analysis.
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS & clsx/tailwind-merge
- **3D & Animation:** Three.js, React Three Fiber, React Globe.gl, Framer Motion, GSAP
- **Data Viz:** Echarts & Leaflet

### ⚙️ Backend (API & ML)
A robust asynchronous engine handling complex geospatial queries and ML predictions.
- **Framework:** FastAPI & Uvicorn
- **Machine Learning:** XGBoost (Classifier), Scikit-Learn (RandomForestRegressor)
- **Geospatial:** `earthengine-api` (Google Earth Engine)
- **Data Science:** Pandas, NumPy, SciPy, SHAP

---

## 📈 Model Performance (v2.1 vs. v1.0)

The v2 upgrade completely overhauled the feature space and algorithm selection, yielding extraordinary improvements:

| Metric | v1.0 (Baseline) | v2.1 (XGBoost/GroupKFold) | Improvement |
| :--- | :--- | :--- | :--- |
| **Accuracy** | 73.11% | **93.49%** | 🚀 +20.4% |
| **Precision** | 70.52% | **91.00%** | 🚀 +20.4% |
| **Recall** | 75.28% | **87.96%** | 🚀 +12.6% |
| **F1-Score** | 72.82% | **89.46%** | 🚀 +16.6% |
| **Regressor R²** | 0.9072 | **0.9416** | 🚀 +3.4% |
| **RMSE** | ±2.63°C | **±2.08°C** | 📉 -0.55°C |

> [!NOTE] 
> **Feature Vector Parity:** 
> Classifier Input -> `[lst_delta, ndvi, ndbi, evi, elevation, ntl]`
> Regressor Input -> `[ndvi, ndbi, evi, elevation, ntl, abs_lat, rural_lst_mean]`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Google Earth Engine Service Account Credentials

### 1️⃣ Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
```
*Ensure you configure your `.env` file with your Earth Engine API keys before starting the server.*

```bash
# Start the FastAPI server
python run.py
# or
uvicorn app.main:app --reload
```

### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*The app will be available at `http://localhost:5173`.*

---

## 🧪 Documentation

For an in-depth understanding of the ML algorithms, architectural choices, and the transition from v1 to v2.1, refer to the included technical documentation:
- [UHI Research Technical Details](./UHI_Research_Technical_Details.txt)
- [UHI Research Paper Details](./UHI_Research_Paper_Details.md)
- [UHI Dataflow Details](./UHI_Dataflow_Details.txt)
- [UHI Workflow Details](./UHI_Workflow_Details.txt)

---
<div align="center">
  <i>Developed to revolutionize sustainable urban planning and extreme heat resilience.</i>
</div>