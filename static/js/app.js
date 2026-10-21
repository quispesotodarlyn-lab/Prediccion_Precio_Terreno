/* ==========================================================
   ValoraTerreno · Lógica del cliente
   - Carga de métricas, tabla y gráficos desde /api/data
   - Validación y predicción mediante fetch() a /api/predict
   - Menú lateral funcional (scroll suave, sección activa, móvil)
   ========================================================== */
(function () {
  "use strict";

  var AREA_MIN = 20, AREA_MAX = 50000;
  var ANTIGUEDAD_MIN = 0, ANTIGUEDAD_MAX = 100;

  var $ = function (id) { return document.getElementById(id); };

  var nfMoneda = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });
  var nfMoneda2 = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 });
  var nfNum = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

  function soles(valor, decimales) {
    var texto = (decimales ? nfMoneda2 : nfMoneda).format(valor);
    return texto.replace("PEN", "S/").replace(/\s+/g, " ").replace(/^S\/\s?/, "S/ ");
  }

  function escapar(texto) {
    var div = document.createElement("div");
    div.textContent = String(texto);
    return div.innerHTML;
  }

  /* ---------- Menú lateral ---------- */
  var sidebar = $("sidebar");
  var overlay = $("overlay");
  var menuLinks = document.querySelectorAll(".menu-link");

  function abrirMenu() { sidebar.classList.add("open"); overlay.classList.add("show"); }
  function cerrarMenu() { sidebar.classList.remove("open"); overlay.classList.remove("show"); }

  $("menuToggle").addEventListener("click", function () {
    sidebar.classList.contains("open") ? cerrarMenu() : abrirMenu();
  });
  overlay.addEventListener("click", cerrarMenu);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarMenu(); });

  function irASeccion(id) {
    var destino = $(id);
    if (!destino) return;
    destino.scrollIntoView({ behavior: "smooth", block: "start" });
    cerrarMenu();
  }

  menuLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      irASeccion(link.dataset.section);
    });
  });
  document.querySelectorAll("[data-scroll]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      irASeccion(el.dataset.scroll);
    });
  });

  function marcarActivo(id) {
    menuLinks.forEach(function (l) { l.classList.toggle("active", l.dataset.section === id); });
  }

  var ids = ["panel", "prediccion", "graficos", "datos", "acerca"];
  function actualizarMenuActivo() {
    var marca = window.scrollY + 140;
    var actual = ids[0];
    ids.forEach(function (id) {
      var el = $(id);
      if (el && el.offsetTop <= marca) actual = id;
    });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) actual = ids[ids.length - 1];
    marcarActivo(actual);
  }
  window.addEventListener("scroll", actualizarMenuActivo, { passive: true });
  actualizarMenuActivo();

  /* ---------- Animación de aparición ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visible"); obs.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    reveals.forEach(function (el) { obs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Estado global ---------- */
  var metricas = null;
  var graficoPrecios = null;
  var graficoDistritos = null;

  /* ---------- Carga de datos ---------- */
  function llenarSelect(id, opciones, etiqueta) {
    var sel = $(id);
    sel.innerHTML = "";
    var vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "Seleccione " + etiqueta;
    sel.appendChild(vacio);
    opciones.forEach(function (op) {
      var o = document.createElement("option");
      o.value = op;
      o.textContent = op.charAt(0).toUpperCase() + op.slice(1);
      sel.appendChild(o);
    });
  }

  function estadoServidor(clase, texto) {
    var el = $("estadoServidor");
    el.className = "status-pill " + clase;
    el.innerHTML = '<i class="bi bi-circle-fill"></i> ' + texto;
  }

  function pintarMetricas(m) {
    $("statRegistros").textContent = nfNum.format(m.registros);
    $("statSplit").textContent = nfNum.format(m.entrenamiento) + " entrenamiento · " + nfNum.format(m.prueba) + " prueba";
    $("statAlgoritmo").textContent = m.algoritmo;
    $("statMae").textContent = soles(m.mae, true);
    $("statR2").textContent = m.r2.toFixed(4);
  }

  function pintarTabla(registros) {
    var cuerpo = $("tablaBody");
    if (!registros.length) {
      cuerpo.innerHTML = '<tr><td colspan="7" class="table-loading">No hay registros para mostrar.</td></tr>';
      return;
    }
    cuerpo.innerHTML = registros.map(function (r) {
      return "<tr>" +
        '<td><span class="id-chip">' + escapar(r.id_terreno) + "</span></td>" +
        "<td>" + escapar(r.distrito) + "</td>" +
        '<td style="text-transform:capitalize">' + escapar(r.zona) + "</td>" +
        '<td><span class="badge ' + escapar(String(r.tipo_terreno).toLowerCase()) + '">' + escapar(r.tipo_terreno) + "</span></td>" +
        '<td class="num">' + nfNum.format(r.area_m2) + " m²</td>" +
        '<td class="num">' + nfNum.format(r.antiguedad_anios) + " años</td>" +
        '<td class="num precio-cell">' + soles(r.precio_soles, false) + "</td>" +
        "</tr>";
    }).join("");
  }

  function pintarGraficos(g) {
    if (typeof Chart === "undefined") {
      document.querySelectorAll(".chart-box").forEach(function (b) {
        b.innerHTML = '<p style="color:#64748b;padding:20px">No se pudo cargar Chart.js. Verifique su conexión a internet.</p>';
      });
      return;
    }
    Chart.defaults.font.family = '"Inter", "Segoe UI", sans-serif';
    Chart.defaults.color = "#64748b";

    if (graficoPrecios) graficoPrecios.destroy();
    if (graficoDistritos) graficoDistritos.destroy();

    graficoPrecios = new Chart($("chartPrecios"), {
      type: "bar",
      data: {
        labels: g.precios.etiquetas,
        datasets: [{
          label: "Cantidad de terrenos",
          data: g.precios.valores,
          backgroundColor: "rgba(37, 99, 235, 0.85)",
          hoverBackgroundColor: "#10b981",
          borderRadius: 8,
          maxBarThickness: 56
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: function (c) { return " " + c.parsed.y + " terrenos"; } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 40, minRotation: 0 } },
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#eef2f7" }, title: { display: true, text: "Cantidad" } }
        }
      }
    });

    graficoDistritos = new Chart($("chartDistritos"), {
      type: "doughnut",
      data: {
        labels: g.distritos.etiquetas,
        datasets: [{
          data: g.distritos.valores,
          backgroundColor: ["#2563eb", "#10b981", "#0f2a5c", "#f59e0b", "#0d9488", "#60a5fa"],
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, padding: 16 } },
          tooltip: {
            callbacks: {
              label: function (c) {
                var total = c.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = ((c.parsed / total) * 100).toFixed(1);
                return " " + c.label + ": " + c.parsed + " (" + pct + " %)";
              }
            }
          }
        }
      }
    });
  }

  function cargarDatos() {
    return fetch("/api/data")
      .then(function (resp) {
        if (!resp.ok) throw new Error("Respuesta " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        metricas = data.metricas;
        pintarMetricas(data.metricas);
        llenarSelect("distrito", data.opciones.distritos, "un distrito");
        llenarSelect("zona", data.opciones.zonas, "una zona");
        llenarSelect("tipo_terreno", data.opciones.tipos, "un tipo");
        pintarTabla(data.registros);
        pintarGraficos(data.graficos);
        estadoServidor("ok", "Modelo entrenado");
      })
      .catch(function () {
        estadoServidor("fail", "Sin conexión");
        $("tablaBody").innerHTML = '<tr><td colspan="7" class="table-loading">No se pudieron cargar los datos del servidor.</td></tr>';
      });
  }

  /* ---------- Formulario ---------- */
  var form = $("formPrediccion");
  var btn = $("btnPredecir");
  var alerta = $("formAlert");
  var campos = ["distrito", "zona", "tipo_terreno", "area_m2", "antiguedad_anios"];

  function ponerError(campo, mensaje) {
    var cont = $(campo).closest(".field");
    cont.classList.toggle("invalid", !!mensaje);
    $("err-" + campo).textContent = mensaje || "";
  }

  function limpiarErrores() {
    campos.forEach(function (c) { ponerError(c, ""); });
    alerta.hidden = true;
    alerta.textContent = "";
  }

  function mostrarAlerta(mensaje) {
    alerta.textContent = mensaje;
    alerta.hidden = false;
  }

  function validar() {
    var ok = true;
    limpiarErrores();

    if (!$("distrito").value) { ponerError("distrito", "Seleccione un distrito."); ok = false; }
    if (!$("zona").value) { ponerError("zona", "Seleccione una zona."); ok = false; }
    if (!$("tipo_terreno").value) { ponerError("tipo_terreno", "Seleccione un tipo de terreno."); ok = false; }

    var areaTxt = $("area_m2").value.trim();
    var area = Number(areaTxt);
    if (areaTxt === "" || isNaN(area)) {
      ponerError("area_m2", "Ingrese el área en m²."); ok = false;
    } else if (area < AREA_MIN || area > AREA_MAX) {
      ponerError("area_m2", "Debe estar entre " + AREA_MIN + " y " + nfNum.format(AREA_MAX) + " m²."); ok = false;
    }

    var antTxt = $("antiguedad_anios").value.trim();
    var ant = Number(antTxt);
    if (antTxt === "" || isNaN(ant)) {
      ponerError("antiguedad_anios", "Ingrese la antigüedad."); ok = false;
    } else if (ant < ANTIGUEDAD_MIN || ant > ANTIGUEDAD_MAX) {
      ponerError("antiguedad_anios", "Debe estar entre " + ANTIGUEDAD_MIN + " y " + ANTIGUEDAD_MAX + " años."); ok = false;
    }
    return ok;
  }

  campos.forEach(function (c) {
    $(c).addEventListener("input", function () { ponerError(c, ""); alerta.hidden = true; });
    $(c).addEventListener("change", function () { ponerError(c, ""); });
  });

  function mostrarResultado(r) {
    $("resPrecio").textContent = soles(r.precio_estimado, false);
    $("resDistrito").textContent = r.distrito;
    $("resZona").textContent = r.zona;
    $("resTipo").textContent = r.tipo_terreno;
    $("resArea").textContent = nfNum.format(r.area_m2) + " m²";
    $("resAntiguedad").textContent = nfNum.format(r.antiguedad_anios) + (r.antiguedad_anios === 1 ? " año" : " años");
    $("resMae").textContent = soles(r.mae, true);
    $("resR2").textContent = r.r2.toFixed(4);

    $("resultEmpty").hidden = true;
    var cuerpo = $("resultBody");
    cuerpo.hidden = false;
    cuerpo.classList.remove("show");
    void cuerpo.offsetWidth; // reinicia la animación
    cuerpo.classList.add("show");

    if (window.matchMedia("(max-width: 960px)").matches) {
      $("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validar()) return;

    var payload = {
      distrito: $("distrito").value,
      zona: $("zona").value,
      tipo_terreno: $("tipo_terreno").value,
      area_m2: Number($("area_m2").value),
      antiguedad_anios: Number($("antiguedad_anios").value)
    };

    btn.disabled = true;
    btn.classList.add("loading");

    fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (resp) {
        return resp.json().then(function (data) { return { ok: resp.ok, data: data }; });
      })
      .then(function (res) {
        if (!res.ok || !res.data.ok) {
          mostrarAlerta(res.data.error || "No se pudo realizar la predicción.");
          return;
        }
        mostrarResultado(res.data);
      })
      .catch(function () {
        mostrarAlerta("No se pudo conectar con el servidor. Verifique que Flask esté en ejecución.");
      })
      .finally(function () {
        btn.disabled = false;
        btn.classList.remove("loading");
      });
  });

  $("btnLimpiar").addEventListener("click", function () {
    form.reset();
    limpiarErrores();
    $("resultBody").hidden = true;
    $("resultEmpty").hidden = false;
  });

  /* ---------- Inicio ---------- */
  cargarDatos();
})();
