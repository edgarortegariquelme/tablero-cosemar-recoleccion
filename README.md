# Tablero Cosemar Recolección

Control contractual del servicio de recolección, transporte y disposición final de RSD de Alto Hospicio, contrato con Cosemar SpA (P.P. 060/2023, ID Mercado Público 3447-86-LR23). Unidad Técnica: DMAO.

- Tablero: https://claude.ai/artifact/FqSZ9xCaUeVFhjHQPZhtMG
- Libro de control en Notion: «Cosemar · Libro de control», bajo Trazabilidad de trámites DMAO.

## Cómo funciona

```
Drive (expediente) ─┐
Notion Comunicaciones ┼─> n8n 1 · Ingesta (cada hora) ──> Notion · Libro de control ──> Tablero (lee en vivo 4 vistas)
Webhook /evento ────┘        │ valida, deduplica, rectifica           │
                              └─> errores ─> n8n 3 · Reproceso (6 h)   └─> n8n 2 · Avisos (08:10, una vez por evento)
```

El cálculo de estados, plazos (días hábiles, BA 7, 177–186) y montos vive en un solo archivo, `motor/motor.js`, que se inserta igual en los nodos Code de n8n y en el tablero.

## Estructura

| Carpeta | Contenido |
|---|---|
| `motor/` | Motor de reglas: validación, huella, rectificaciones, sanciones, pagos, vencimientos, avisos, cobertura |
| `datos/` | `catalogo.js` (matriz de 40 obligaciones, precios por decreto, flujogramas) y `semilla.js` (carga inicial del libro, 161 registros) |
| `n8n/` | Fuentes de los nodos Code, `build.js` que genera los flujos, `produccion/` y `prueba/` |
| `tablero/store/` | Página del tablero (`index.html`, `app.js`, `motor.js`) y `catalogo.json` |
| `pruebas/` | API simulada de Notion y Drive, batería de extremo a extremo (12 pruebas), arnés del tablero con jsdom |
| `entregables/` | Matriz de obligaciones (.xlsx), flujos n8n listos para importar, `LEEME.md` con puesta en marcha y tabla de pruebas |

## Uso

```bash
npm install
npm run test:motor
npm run test:tablero
npm run build:n8n
```

Pruebas de extremo a extremo: levantar `npm run mock`, importar `n8n/prueba/*.json` en un n8n local (Node 24), publicarlos y ejecutar `npm run test:e2e`.

Puesta en marcha en n8n de producción: ver `entregables/LEEME.md`.

## Límites conocidos

Ver la hoja «Límites de la revisión» de la matriz y la página del libro en Notion (diferencias entre fuentes pendientes de documento).
