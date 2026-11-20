# Control Cosemar · cómo funciona solo

Cada hora, GitHub Actions (`.github/workflows/actualizar-app.yml`) corre `acciones/vigilante.js`:

1. **Lee Gmail** por el puente de Apps Script (`acciones/gmail.js` + `acciones/puente_gmail.gs`). Toma los correos de Cosemar/Grupo EBI, de la ITS y los que citan los ID de licitación, desde la última lectura.
   - **Correos**: una fila por hilo. Si el último mensaje es de Cosemar y pide algo, queda en «Responder» y aparece como alerta. Si lo envió el municipio, queda «En curso». Los tickets diarios del relleno quedan como «Informativo» y no generan aviso.
   - **Manifolds**: se detectan por un adjunto o un asunto que diga «manifold N». Entran como «Abierto» para que revises el motivo y el plazo.
   - **Revisiones técnicas**: se detectan por el asunto «Revisión Técnica M-922». El certificado PDF se lee, con OCR si es escaneado; la fecha «válida hasta» se carga en Flota y la imagen se guarda en `docs/fotos/`.
2. **Regenera los datos y la app** (`datos/operacion.js` y `datos/construir_app.js`). Lo curado a mano en `datos/operacion.js` siempre manda sobre lo automático (`datos/auto/gmail.json`).
3. **Calcula las alertas** (`acciones/alertas.js`). Es el mismo cálculo que muestra la app: OC atrasadas, facturas y pagos fuera de plazo, RT por vencer, manifolds vencidos y correos urgentes.
4. **Envía un solo correo, y solo si hay algo nuevo.** Recibes novedades de Gmail más las alertas que no se habían avisado (`datos/auto/avisados.json`). Si no hay nada nuevo, no llega correo.

## Activación (una sola vez, ~10 minutos)

La conexión con Gmail se hace con un **puente de Google Apps Script** (`acciones/puente_gmail.gs`). Corre dentro de tu cuenta de Google y no usa contraseñas: lee los correos del contrato y envía los avisos desde tu Gmail.

| Paso | Dónde | Qué |
|---|---|---|
| 1 | https://script.google.com → **Nuevo proyecto** | Borrar lo que trae, pegar todo `acciones/puente_gmail.gs` y guardar con el nombre «Puente Cosemar» |
| 2 | **Implementar → Nueva implementación** → engranaje → **Aplicación web** | Ejecutar como: **Yo** · Quién tiene acceso: **Cualquier usuario** → Implementar → **Autorizar acceso**. Si Google advierte «app no verificada», ir a *Configuración avanzada → Ir a Puente Cosemar* (es tu propio script) |
| 3 | Arriba, elegir la función **enlace** → **Ejecutar** | En el registro aparece `?k=...`: el enlace es la URL de la aplicación web (termina en **/exec**) seguida de ese `?k=...`. Si el enlace se compartió, ejecutar **nuevaClave** |
| 4 | GitHub → repo → Settings → Secrets and variables → Actions → **New repository secret** | `GMAIL_PUENTE_URL` = ese enlace · `AVISOS_CC` = el correo institucional @maho.cl |
| 5 | GitHub → Settings → General → Change visibility | **Public**, para que el enlace de la app abra sin cuenta |
| 6 | GitHub → Settings → Pages | Branch `main`, carpeta `/docs` → Save |
| 7 | GitHub → Actions → «Actualizar app Cosemar» → **Run workflow** | Llega el primer correo con las alertas abiertas |

El enlace del puente es secreto: sin la clave `?k=` el script no entrega nada, y solo envía correos a tu propia cuenta (con copia únicamente a direcciones @maho.cl).
Alternativa si algún día tienes contraseña de aplicación de Google: secretos `GMAIL_USUARIO`, `GMAIL_CLAVE_APP` y `AVISOS_PARA` en vez del puente.

Sin secretos la app igual se reconstruye cada hora; solo se omiten la lectura de Gmail y el correo.

## Mantención
- **Corregir o completar algo** (motivo de un manifold, estado de un correo): editar la fila en `datos/operacion.js`. Lo curado manda.
- **Nuevo proceso sancionatorio**: agregarlo en `datos/catalogo.js` (`sanciones`) y sus hitos en `datos/libro_novedades.json`.
