# Traspaso de sesión — Tablero Cosemar (P.P. 060/2023 · ID 3447-86-LR23)

Fecha de corte: 2026-11-17. Rama `main`.

## Estado
- Tablero en vivo (Notion → Claude Data artifact): https://claude.ai/artifact/FqSZ9xCaUeVFhjHQPZhtMG — check aprobado.
- Traspaso para continuar con otra IA (estado, cifras, pendientes y prompt): https://app.notion.com/p/41c9e3e655c08148bd93e0485c7331d0
- Borrador «Visual analysis» en `drafts/kmut6ifm93nv` (fuente: `tablero/draft/`), pendiente de Guardar/Cancelar por el usuario.
- Motor de reglas compartido: `motor/motor.js` (copias en `tablero/store/` y `tablero/draft/`).
- Flujos n8n (JSON de producción): `entregables/cosemar_1_ingesta.json`, `cosemar_2_avisos.json`, `cosemar_3_reproceso.json`. 12/12 pruebas e2e aprobadas en n8n local (`pruebas/e2e.js`, `pruebas/resultados_e2e.json`).
- Avisos a: CORREO_AVISOS (configurado en `n8n/build.js`).
- Matriz de obligaciones: `entregables/Matriz_obligaciones_Cosemar_3447-86-LR23.xlsx`.

## Pendiente (único bloqueo)
Activar los 3 flujos en n8n Cloud `edgar-ortega.app.n8n.cloud`.
- La API devuelve 401 «upstream auth failed» con la clave de red guardada «n8n API edgar-ortega».
- Pasos: (1) usuario crea clave nueva en n8n Settings → n8n API; (2) borra las claves de red «n8n API» antiguas del entorno; (3) guardar la nueva con request_credential (host edgar-ortega.app.n8n.cloud, header X-N8N-API-KEY, sin prefijo).
- Luego: `node n8n/despliegue/desplegar.js inventario` → `importar` → `activar`. Verificar que existan credenciales Notion, Google Drive y Gmail en n8n; si faltan, informar cuáles.
- Alternativa manual: Import from file de los 3 JSON, asignar credenciales, activar.

## Control del PC
Computador M370-00507, carpeta `PASE_CLAUDE_CODE_PP73_2026_v2`: figura como no utilizable desde la nube (posible carpeta oculta o app de Claude desactualizada).

## Actualización 18-11-2026
- Tablero: secciones nuevas «Alzas y deuda» (recolección), «Plan de pago vigente» (Notion 17-11-2026) y «Disposición final» (3447-187-LR24).
- Datos: `datos/historico_pagos.js` (recolección, jul-2024 a oct-2026), `datos/plan_pago.js`, `datos/disposicion_final.js` (ene-2025 a oct-2026). Planillas: `datos/planilla_deuda.py`, `datos/planilla_disposicion.py` → `entregables/`.
- Deuda recolección a oct-2026: $24.690.339 por decretos (D.A. 3.957 no aplicado) + $45.023.996 por IPC 4,3% sin decreto.
- Disposición final: sin diferencias de precio; sin memo de pago jul–ago 2025 y oct 2026; base de toneladas del D.A. 2.737 por verificar.
- Tareas programadas (sin conector Google Drive hasta que el usuario lo agregue en claude.ai): Actualizar deuda (día 28, trig_01JuDoJiLtVSb8GpTxLkjxma), Borradores ciclo de pago (día 7, trig_0144c4spvPTKukqd5UWW6BPN), Reajuste IPC anual (10-jul y 10-ago, trig_0182X98CJ8K9MKHgQRu1i4wn), Disposición final (día 8, trig_01Sz5gvRK5h8ArBMAB7wifm7).

## Actualización 18-11-2026 (tarde)
- Confirmación del encargado: pagado todo 2024 y 2025 (ambos contratos) y las mensualidades de 2026 hasta septiembre. En 2026 solo se adeudan el IPC 4,3% y el aumento poblacional del D.A. 3.957, según el plan de pago.
- Constancia en Notion: https://app.notion.com/p/41c9e3e655c0811cb8e6d6e6afb7724c · 11 hitos «pago» agregados al Libro de control (dic-2025 a sep-2026 y retroactivo D.A. 2.459), verificación «Reportado».
- Pendiente de pago: octubre 2026 en ambos contratos (recolección según plan, en febrero de 2027).

## 18-11-2026 (tarde) · tablero en pestañas
- Pestañas por CSS (sin scripts): Operación (selector Recolección / Disposición final), Multas, Manifolds, Correos, Flota, Personal, Bono SUBDERE y Análisis y deuda.
- `tablero/draft/operacion.js` (nuevo): cálculos `c_ciclo`, `c_presupuesto`, `c_decretos` y `c_alertas`, y los dibujos de las pestañas nuevas.
- `datos/operacion.js` genera manifolds, correos, flota, personal (solo agregados, sin nombres ni RUT), subdere, antecedentes, ciclo_fechas y resumenes en `tablero/store/`.
- Reglas del ciclo: Cosemar informa del 1 al 5; OC en máximo 7 días desde el memo (alerta al vencer); factura del 15 al 20; pago a 30 días de la factura.
- Presupuesto 2026 estimado = lo pagado con cargo a 2026 en ambos contratos ($3.799 M); deuda de octubre a diciembre que pasa a 2027: $1.147 M (estimación, falta la cifra oficial de DAF).
- Bases recolección art. 36: $250–260 M/mes de referencia × 60 meses (art. 82).

## 18-11-2026 (noche) · app independiente
- `docs/`: app web sin Claude (HTML + JS + JSON). `docs/js/runtime.js` reemplaza al runtime de Claude (`dash.*`) leyendo `docs/data/*.json`.
- `node datos/construir_app.js` copia el código de `tablero/draft/` y los datos, y genera además `entregables/Control_Cosemar.html` (un solo archivo con todo incrustado, se abre con doble clic).
- `datos/exportar_notion.js` baja el libro de control con la API de Notion (variable `NOTION_TOKEN`) a `docs/data/notion/`; si no hay token se usa la semilla.
- `.github/workflows/actualizar-app.yml`: cada hora exporta Notion, regenera y hace commit si cambió algo. Falta el secreto `NOTION_TOKEN` y activar GitHub Pages (carpeta /docs).
- Fotos por móvil: carpeta Drive 10lZuRbhinsJcuIQVneD2kLnwh861lBwG. Imposiciones ene–jul 2026 en Drive (pagos mensuales); faltan ago–oct.
