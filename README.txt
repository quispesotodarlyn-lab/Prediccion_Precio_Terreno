==============================================================
 ValoraTerreno
 Sistema de predicción del precio de terrenos mediante Machine Learning
==============================================================

AVISO IMPORTANTE
Los datos del archivo datos_proyecto_ml_750_terrenos.csv son SINTÉTICOS
(generados automáticamente con Python) y NO representan tasaciones reales
del mercado inmobiliario. Se usan únicamente con fines educativos.
El resultado de la página es una estimación académica, no una tasación oficial.

--------------------------------------------------------------
 REQUISITOS
--------------------------------------------------------------
- Windows 10 u 11
- Python 3.10 o superior (https://www.python.org/downloads/)
  Durante la instalación marque la casilla "Add python.exe to PATH".
- Visual Studio Code
- Conexión a internet (para instalar las librerías y cargar Chart.js
  y las fuentes/iconos desde un CDN).

--------------------------------------------------------------
 PASOS PARA EJECUTAR EL PROYECTO
--------------------------------------------------------------

1) ABRIR LA CARPETA DEL PROYECTO
   - Abra Visual Studio Code.
   - Menú Archivo > Abrir carpeta...
   - Seleccione la carpeta "Valora_Tu_Terreno_Web".

2) ABRIR LA TERMINAL
   - Menú Terminal > Nueva terminal (PowerShell).
   - Verifique que la ruta termine en Valora_Tu_Terreno_Web.

3) CREAR EL ENTORNO VIRTUAL
   py -m venv .venv

4) INSTALAR LAS DEPENDENCIAS
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt

5) EJECUTAR LA APLICACIÓN FLASK
   .\.venv\Scripts\python.exe app.py

   Al iniciar, la aplicación carga el modelo ya entrenado desde
   modelo_terrenos.pkl y sus métricas desde metricas_modelo.json. Si esos
   archivos no existen, entrena el modelo con el CSV y los crea.

6) ABRIR LA PÁGINA EN EL NAVEGADOR
   http://127.0.0.1:5000

7) DETENER EL SERVIDOR
   En la terminal presione Ctrl + C.

--------------------------------------------------------------
 SI POWERSHELL BLOQUEA LA EJECUCIÓN
--------------------------------------------------------------
Los comandos anteriores no requieren activar el entorno virtual, por lo que
normalmente no hay problema. Si aun así aparece un error de permisos, use:
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

--------------------------------------------------------------
 ESTRUCTURA DEL PROYECTO
--------------------------------------------------------------
Valora_Tu_Terreno_Web/
  app.py                               Servidor Flask y modelo de ML
  entrenar_modelo.py                   Entrena el modelo y crea el .pkl
  modelo_terrenos.pkl                  Modelo entrenado (Pipeline completo)
  metricas_modelo.json                 MAE, R² y tamaños de las particiones
  generar_datos.py                     Generador opcional de datos sintéticos
  requirements.txt                     Dependencias de Python
  README.txt                           Este archivo
  datos_proyecto_ml_750_terrenos.csv   Datos sintéticos
  templates/index.html                 Página principal
  static/css/style.css                 Estilos
  static/js/app.js                     Interacciones y llamadas fetch()

--------------------------------------------------------------
 CÓMO FUNCIONA
--------------------------------------------------------------
- Modelo: RandomForestRegressor dentro de un Pipeline de scikit-learn con
  OneHotEncoder para distrito, zona y tipo de terreno.
- Entrada: distrito, zona, tipo de terreno, área (m²) y antigüedad (años).
- Salida: precio estimado en soles (S/).
- Evaluación: 80 % entrenamiento y 20 % prueba. Se calculan MAE y R².
- Las métricas se calculan al entrenar el modelo (entrenar_modelo.py) y se
  guardan en metricas_modelo.json; no están escritas manualmente.

Rutas de Flask:
  /              Página principal
  /api/predict   Recibe el formulario (POST, JSON) y devuelve la predicción
  /api/data      Devuelve métricas, filas de ejemplo y datos de los gráficos

--------------------------------------------------------------
 VOLVER A ENTRENAR EL MODELO (.pkl)
--------------------------------------------------------------
Si modifica el CSV, vuelva a entrenar y guardar el modelo con:
   .\.venv\Scripts\python.exe entrenar_modelo.py
Esto crea de nuevo modelo_terrenos.pkl y metricas_modelo.json.
Después reinicie la aplicación.

Nota: generar_datos.py es un generador de datos sintéticos de ejemplo.
Si lo ejecuta, reemplazará el CSV actual por otro con categorías en
minúscula; en ese caso vuelva a ejecutar entrenar_modelo.py.

--------------------------------------------------------------
 SOLUCIÓN DE PROBLEMAS
--------------------------------------------------------------
- "py no se reconoce": reinstale Python marcando "Add python.exe to PATH"
  o pruebe con "python -m venv .venv".
- "Address already in use": otro programa usa el puerto 5000; cierre la
  otra terminal o cambie el puerto al final de app.py.
- Los gráficos no aparecen: verifique su conexión a internet (Chart.js
  se carga desde un CDN).
