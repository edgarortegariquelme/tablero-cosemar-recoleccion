# Traspaso de sesión — Tablero Cosemar (P.P. 060/2023 · ID 3447-86-LR23)

Fecha de corte: 2026-11-17. Rama `main`.

## Estado
- Tablero en vivo (Notion → Claude Data artifact): https://claude.ai/artifact/FqSZ9xCaUeVFhjHQPZhtMG — check aprobado.
- Borrador «Visual analysis» en `drafts/kmut6ifm93nv` (fuente: `tablero/draft/`), pendiente de Guardar/Cancelar por el usuario.
- Motor de reglas compartido: `motor/motor.js` (copias en `tablero/store/` y `tablero/draft/`).
- Flujos n8n (JSON de producción): `entregables/cosemar_1_ingesta.json`, `cosemar_2_avisos.json`, `cosemar_3_reproceso.json`. 12/12 pruebas e2e aprobadas en n8n local (`pruebas/e2e.js`, `pruebas/resultados_e2e.json`).
- Avisos a: edgar.ortega.riquelme@gmail.com (configurado en `n8n/build.js`).
- Matriz de obligaciones: `entregables/Matriz_obligaciones_Cosemar_3447-86-LR23.xlsx`.

## Antecedente del 17 de noviembre
Al cierre de esa sesión se propuso activar los 3 flujos en n8n Cloud `edgar-ortega.app.n8n.cloud`.
- La API devuelve 401 «upstream auth failed» con la clave de red guardada «n8n API edgar-ortega».
- Pasos: (1) usuario crea clave nueva en n8n Settings → n8n API; (2) borra las claves de red «n8n API» antiguas del entorno; (3) guardar la nueva con request_credential (host edgar-ortega.app.n8n.cloud, header X-N8N-API-KEY, sin prefijo).
- Luego: `node n8n/despliegue/desplegar.js inventario` → `importar` → `activar`. Verificar que existan credenciales Notion, Google Drive y Gmail en n8n; si faltan, informar cuáles.
- Alternativa manual: Import from file de los 3 JSON, asignar credenciales, activar.

## Revisión del 18 de noviembre

Consultar [auditoría y recuperación](documentacion/auditoria-integraciones.md) antes de usar las instrucciones históricas. La publicación requiere aprobación separada.

## Control del PC
Computador M370-00507, carpeta `PASE_CLAUDE_CODE_PP73_2026_v2`: figura como no utilizable desde la nube (posible carpeta oculta o app de Claude desactualizada).
