"""
ValoraTerreno: Sistema de predicción del precio de terrenos mediante Machine Learning.

Servidor Flask + modelo RandomForestRegressor (scikit-learn).
El modelo se carga desde modelo_terrenos.pkl (creado con entrenar_modelo.py).
Si el archivo .pkl no existe, se entrena automáticamente con el CSV.
Los datos del CSV son SINTÉTICOS y no representan tasaciones reales.
"""
import json
import os

import joblib
import pandas as pd
from flask import Flask, jsonify, render_template, request

import entrenar_modelo as em

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

COLUMNAS_ENTRADA = em.COLUMNAS_ENTRADA
COLUMNA_OBJETIVO = em.COLUMNA_OBJETIVO

# Límites de validación
AREA_MIN, AREA_MAX = 20, 50000
ANTIGUEDAD_MIN, ANTIGUEDAD_MAX = 0, 100

# Rangos de precios (S/) para el gráfico de distribución
RANGOS_PRECIO = [
    (0, 15000, "Menos de 15 mil"),
    (15000, 30000, "15 mil - 30 mil"),
    (30000, 60000, "30 mil - 60 mil"),
    (60000, 100000, "60 mil - 100 mil"),
    (100000, 150000, "100 mil - 150 mil"),
    (150000, float("inf"), "Más de 150 mil"),
]

app = Flask(__name__)
app.json.ensure_ascii = False


@app.context_processor
def version_de_archivos():
    """Añade ?v=... a CSS y JS para que el navegador no use copias antiguas."""
    def mtime(ruta):
        try:
            return int(os.path.getmtime(os.path.join(BASE_DIR, "static", ruta)))
        except OSError:
            return 0
    return {"asset_version": mtime("css/style.css") + mtime("js/app.js")}


def cargar_modelo():
    """Carga el .pkl y sus métricas; si no existen, entrena y los crea."""
    if os.path.exists(em.MODELO_PATH) and os.path.exists(em.METRICAS_PATH):
        try:
            modelo = joblib.load(em.MODELO_PATH)
            with open(em.METRICAS_PATH, encoding="utf-8") as f:
                metricas = json.load(f)
            return modelo, metricas, "pkl"
        except Exception as error:  # archivo dañado o versión incompatible
            print(f"No se pudo cargar el .pkl ({error}). Se entrenará de nuevo.")
    modelo, metricas = em.entrenar_y_guardar()
    return modelo, metricas, "entrenado"


DATOS = em.cargar_datos()
MODELO, METRICAS, ORIGEN_MODELO = cargar_modelo()
METRICAS["registros"] = int(len(DATOS))

ORDEN_ZONAS = ["Céntrica", "Urbana", "Periférica", "Rural"]
_zonas_csv = set(DATOS["zona"].unique())
OPCIONES = {
    "distritos": sorted(DATOS["distrito"].unique().tolist()),
    "zonas": [z for z in ORDEN_ZONAS if z in _zonas_csv] + sorted(_zonas_csv - set(ORDEN_ZONAS)),
    "tipos": sorted(DATOS["tipo_terreno"].unique().tolist()),
}


def datos_graficos():
    """Agrega los datos reales del CSV para los gráficos de Chart.js."""
    precios = DATOS[COLUMNA_OBJETIVO]
    etiquetas, valores = [], []
    for minimo, maximo, etiqueta in RANGOS_PRECIO:
        cantidad = int(((precios >= minimo) & (precios < maximo)).sum())
        etiquetas.append(etiqueta)
        valores.append(cantidad)

    conteo = DATOS["distrito"].value_counts()
    return {
        "precios": {"etiquetas": etiquetas, "valores": valores},
        "distritos": {
            "etiquetas": conteo.index.tolist(),
            "valores": [int(v) for v in conteo.values],
        },
    }


def error_json(mensaje, codigo=400):
    return jsonify({"ok": False, "error": mensaje}), codigo


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/predict", methods=["POST"])
def api_predict():
    cuerpo = request.get_json(silent=True)
    if not isinstance(cuerpo, dict):
        return error_json("Los datos enviados no tienen un formato JSON válido.")

    distrito = str(cuerpo.get("distrito", "")).strip()
    zona = str(cuerpo.get("zona", "")).strip()
    tipo = str(cuerpo.get("tipo_terreno", "")).strip()

    if distrito not in OPCIONES["distritos"]:
        return error_json("Seleccione un distrito válido.")
    if zona not in OPCIONES["zonas"]:
        return error_json("Seleccione una zona válida.")
    if tipo not in OPCIONES["tipos"]:
        return error_json("Seleccione un tipo de terreno válido.")

    try:
        area = float(cuerpo.get("area_m2"))
    except (TypeError, ValueError):
        return error_json("El área debe ser un número válido.")
    try:
        antiguedad = float(cuerpo.get("antiguedad_anios"))
    except (TypeError, ValueError):
        return error_json("La antigüedad debe ser un número válido.")

    if not (AREA_MIN <= area <= AREA_MAX):
        return error_json(
            f"El área debe estar entre {AREA_MIN} y {AREA_MAX} m²."
        )
    if not (ANTIGUEDAD_MIN <= antiguedad <= ANTIGUEDAD_MAX):
        return error_json(
            f"La antigüedad debe estar entre {ANTIGUEDAD_MIN} y {ANTIGUEDAD_MAX} años."
        )

    entrada = pd.DataFrame(
        [
            {
                "distrito": distrito,
                "zona": zona,
                "tipo_terreno": tipo,
                "area_m2": area,
                "antiguedad_anios": antiguedad,
            }
        ],
        columns=COLUMNAS_ENTRADA,
    )
    precio = float(MODELO.predict(entrada)[0])

    return jsonify(
        {
            "ok": True,
            "precio_estimado": round(precio, 2),
            "distrito": distrito,
            "zona": zona,
            "tipo_terreno": tipo,
            "area_m2": area,
            "antiguedad_anios": antiguedad,
            "mae": METRICAS["mae"],
            "r2": METRICAS["r2"],
        }
    )


@app.route("/api/data")
def api_data():
    primeros = DATOS.head(8).to_dict(orient="records")
    return jsonify(
        {
            "ok": True,
            "metricas": METRICAS,
            "opciones": OPCIONES,
            "registros": primeros,
            "graficos": datos_graficos(),
        }
    )


if __name__ == "__main__":
    print("=" * 60)
    print("ValoraTerreno listo.")
    print(f"Modelo: {ORIGEN_MODELO} | Registros: {METRICAS['registros']} | MAE: S/ {METRICAS['mae']:.2f} | R2: {METRICAS['r2']:.4f}")
    print("Abra http://127.0.0.1:5000 en su navegador.")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5000, debug=False)
