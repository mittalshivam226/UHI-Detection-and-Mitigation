# Fig. 1. Three-Tier UHIS System Architecture

Below is the Three-Tier Architecture Diagram generated from a research perspective, directly incorporating structural details and specific tools mentioned in your research paper.

> [!NOTE]
> This diagram captures the system's separation of concerns (Presentation, Application, and Data/Intelligence) and emphasizes the multi-threaded Parallel Satellite Data Pipeline, which is crucial for highlighting the real-time inference characteristics needed in an academic context.

```mermaid
graph TB
    %% Styling Classes
    classDef tier fill:#fdfdfd,stroke:#999,stroke-width:2px,stroke-dasharray: 5 5;
    classDef presentation fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#000;
    classDef application fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000;
    classDef data fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#000;
    classDef satellite fill:#ede7f6,stroke:#673ab7,stroke-width:1.5px,color:#000;

    subgraph Tier1 [ ]
        direction TB
        subgraph PresentationTier [Presentation Tier]
            direction LR
            UI["React 18 / Vite<br/>(Interface)"]:::presentation
            Vis["Three.js / R3F<br/>(3D Visualization)"]:::presentation
            Dash["Apache ECharts<br/>(Telemetry & SHAP)"]:::presentation
            Map["Leaflet<br/>(Geospatial Overlay)"]:::presentation
        end
    end

    subgraph Tier2 [ ]
        direction TB
        subgraph ApplicationTier [Application Tier]
            direction TB
            Gateway["FastAPI / Uvicorn Gateway"]:::application
            
            subgraph Microservices [Microservices]
                direction LR
                GEE_Svc["GEE Service<br/>(Data Fetching)"]:::application
                ML_Svc["ML Service<br/>(Inference)"]:::application
                Anal_Svc["Analysis Service<br/>(UHI Severity)"]:::application
                Rec_Svc["Recommendation<br/>Service"]:::application
                Sim_Svc["Simulation<br/>Service"]:::application
            end
            
            Gateway --- GEE_Svc
            Gateway --- ML_Svc
            Gateway --- Anal_Svc
            Gateway --- Rec_Svc
            Gateway --- Sim_Svc
        end
    end

    subgraph Tier3 [ ]
        direction TB
        subgraph DataIntelligenceTier [Data & Intelligence Tier]
            direction TB
            subgraph ParallelPipeline [Parallel Satellite Data Pipeline]
                direction LR
                L89["Landsat 8/9<br/>(LST)"]:::satellite
                S2["Sentinel-2<br/>(NDVI, NDBI, EVI)"]:::satellite
                SRTM["NASA SRTM<br/>(Elevation)"]:::satellite
                VIIRS["NOAA VIIRS<br/>(NTL radiance)"]:::satellite
                GEE_Core["Google Earth Engine<br/>(Cloud Compute)"]:::satellite
                
                L89 --> GEE_Core
                S2 --> GEE_Core
                SRTM --> GEE_Core
                VIIRS --> GEE_Core
            end

            subgraph MLEngine [Machine Learning Engine]
                direction LR
                XGB["XGBoost Classifier<br/>(UHI Detection)"]:::data
                TreeExplainer["SHAP TreeExplainer<br/>(Explainable AI)"]:::data
                RF["Random Forest Regressor<br/>(Counterfactuals)"]:::data
                
                XGB -.- TreeExplainer
            end
        end
    end

    %% Cross-Tier Data Flow
    PresentationTier <-->|"HTTP REST (JSON)"| Gateway
    
    GEE_Svc <-->|"ThreadPoolExecutor (5 Parallel Threads)"| GEE_Core
    ML_Svc <-->|"Feature Vectors"| XGB
    ML_Svc <-->|"Feature Vectors"| RF

    GEE_Core -.->|"Pre-processed Features"| ML_Svc

    %% Applying styles to abstract tiers
    class Tier1,Tier2,Tier3 tier;
```

### Explanation of Components for the Manuscript:
*   **Presentation Tier**: Highlights the frontend stack using React/Three.js for web and 3D visualization, meeting the "mission-control" interaction requirements described in the paper.
*   **Application Tier**: Showcases the core processing logic routed through the asynchronous FastAPI/Uvicorn server, decomposed into highly cohesive microservices for robustness.
*   **Data/Intelligence Tier**: Groups the dual elements critical to the research: the *Parallel Satellite Data Pipeline* (with distinct satellite sources flowing simultaneously into Google Earth Engine execution) and the *Machine Learning Engine* (XGBoost, Random Forest, and SHAP TreeExplainer running in process). 
*   **Data Channels**: Illustrates the HTTP/REST flow out to the presentation tier and specifically annotates the ThreadPoolExecutor implementation between Application and Intelligence tiers that was highlighted as a critical performance optimization in Section III of your paper.
