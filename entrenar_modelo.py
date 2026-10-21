"""
Entrena el modelo de ValoraTerreno con el CSV y lo guarda en un archivo .pkl.

Uso:
    python entrenar_modelo.py

Genera:
    modelo_terrenos.pkl      Pipeline entrenado (OneHotEncoder + RandomForestRegressor)
    metricas_modelo.json     MAE, R2 y tamaños de entrenamiento/prueba

Los datos son sintéticos y no representan tasaciones reales.
"""
import json
import os

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "datos_proyecto_ml_750_terrenos.csv")
MODELO_PATH = os.path.join(BASE_DIR, "modelo_terrenos.pkl")
METRICAS_PATH = os.path.join(BASE_DIR, "metricas_modelo.json")

COLUMNAS_CATEGORICAS = ["distrito", "zona", "tipo_terreno"]
COLUMNAS_NUMERICAS = ["area_m2", "antiguedad_anios"]
COLUMNAS_ENTRADA = COLUMNAS_CATEGORICAS + COLUMNAS_NUMERICAS
COLUMNA_OBJETIVO = "precio_soles"


def cargar_datos():
    return pd.read_csv(CSV_PATH, encoding="utf-8")


def crear_pipeline():
    preprocesador = ColumnTransformer(
        transformers=[
            (
                "categoricas",
                OneHotEncoder(handle_unknown="ignore"),
                COLUMNAS_CATEGORICAS,
            ),
        ],
        remainder="passthrough",  # área y antigüedad pasan sin cambios
    )
    return Pipeline(
        steps=[
            ("preprocesamiento", preprocesador),
            (
                "regresor",
                RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1),
            ),
        ]
    )


def entrenar_y_guardar():
    """Entrena con 80 % de los datos, evalúa con 20 % y guarda .pkl + métricas."""
    datos = cargar_datos()
    X = datos[COLUMNAS_ENTRADA]
    y = datos[COLUMNA_OBJETIVO]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    modelo = crear_pipeline()
    modelo.fit(X_train, y_train)

    predicciones = modelo.predict(X_test)
    metricas = {
        "mae": float(mean_absolute_error(y_test, predicciones)),
        "r2": float(r2_score(y_test, predicciones)),
        "registros": int(len(datos)),
        "entrenamiento": int(len(X_train)),
        "prueba": int(len(X_test)),
        "algoritmo": "Random Forest",
    }

    joblib.dump(modelo, MODELO_PATH, compress=3)
    with open(METRICAS_PATH, "w", encoding="utf-8") as f:
        json.dump(metricas, f, ensure_ascii=False, indent=2)

    return modelo, metricas


if __name__ == "__main__":
    _, m = entrenar_y_guardar()
    print("Modelo entrenado y guardado en:", MODELO_PATH)
    print(f"Registros: {m['registros']} (entrenamiento {m['entrenamiento']}, prueba {m['prueba']})")
    print(f"MAE: S/ {m['mae']:.2f}")
    print(f"R2 : {m['r2']:.4f}")
