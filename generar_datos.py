"""
Generador de datos SINTÉTICOS para el proyecto ValoraTerreno.

Los datos NO representan tasaciones reales del mercado inmobiliario.
Se usan únicamente con fines educativos.
Genera exactamente 750 registros en datos_proyecto_ml_750_terrenos.csv
"""
import os
import numpy as np
import pandas as pd

SEMILLA = 2026
N_REGISTROS = 750

DISTRITOS = ["Satipo", "Pichanaqui", "Mazamari", "Pangoa", "Río Negro", "Coviriali"]
ZONAS = ["céntrica", "urbana", "periférica", "rural"]
TIPOS = ["residencial", "comercial", "agrícola"]

# Precio base por m² (S/) según distrito, zona y tipo (valores ficticios)
FACTOR_DISTRITO = {
    "Satipo": 1.30,
    "Pichanaqui": 1.20,
    "Mazamari": 1.00,
    "Pangoa": 0.85,
    "Río Negro": 0.90,
    "Coviriali": 0.75,
}
FACTOR_ZONA = {"céntrica": 2.4, "urbana": 1.6, "periférica": 1.0, "rural": 0.45}
FACTOR_TIPO = {"residencial": 1.0, "comercial": 1.55, "agrícola": 0.50}
PRECIO_BASE_M2 = 70.0

# Rango de área (m²) según tipo
RANGO_AREA = {
    "residencial": (120, 600),
    "comercial": (150, 900),
    "agrícola": (2000, 20000),
}


def generar(ruta_salida):
    rng = np.random.default_rng(SEMILLA)
    filas = []
    for i in range(1, N_REGISTROS + 1):
        distrito = rng.choice(DISTRITOS, p=[0.24, 0.20, 0.16, 0.14, 0.14, 0.12])
        zona = rng.choice(ZONAS, p=[0.18, 0.34, 0.28, 0.20])
        tipo = rng.choice(TIPOS, p=[0.50, 0.25, 0.25])

        # Coherencia: lo agrícola es poco común en zona céntrica
        if tipo == "agrícola" and zona == "céntrica":
            zona = rng.choice(["periférica", "rural"])

        amin, amax = RANGO_AREA[tipo]
        area = int(round(rng.uniform(amin, amax)))
        antig = int(rng.integers(0, 31))

        precio_m2 = (
            PRECIO_BASE_M2
            * FACTOR_DISTRITO[distrito]
            * FACTOR_ZONA[zona]
            * FACTOR_TIPO[tipo]
        )
        # Los terrenos grandes tienen descuento por volumen
        descuento_area = (area / 500.0) ** -0.12
        # Un terreno más antiguo (con servicios consolidados) se valora ligeramente más
        efecto_antig = 1.0 + 0.004 * antig
        # Ruido aleatorio para evitar una fórmula exacta
        ruido = rng.normal(1.0, 0.12)

        precio = precio_m2 * area * descuento_area * efecto_antig * max(ruido, 0.6)
        precio = int(round(precio / 100.0) * 100)

        filas.append(
            {
                "id_terreno": f"T{i:04d}",
                "distrito": distrito,
                "zona": zona,
                "tipo_terreno": tipo,
                "area_m2": area,
                "antiguedad_anios": antig,
                "precio_soles": precio,
            }
        )

    df = pd.DataFrame(filas)
    df.to_csv(ruta_salida, index=False, encoding="utf-8")
    return df


if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))
    destino = os.path.join(base, "datos_proyecto_ml_750_terrenos.csv")
    datos = generar(destino)
    print(f"CSV generado: {destino} ({len(datos)} registros)")
