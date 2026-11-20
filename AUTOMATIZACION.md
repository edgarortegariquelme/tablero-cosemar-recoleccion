# Control Cosemar · cómo funciona solo

Cada hora, GitHub Actions (`.github/workflows/actualizar-app.yml`) corre `acciones/vigilante.js`:

1. **Lee Gmail** por IMAP (`acciones/gmail.js`). Toma los correos de Cosemar/Grupo EBI, de la ITS y los que citan los ID de licitación, desde la última lectura.
   - **Correos**: una fila por hilo. Si el último mensaje es de Cosemar y pide algo, queda en «Responder» y aparece como alerta. Si lo envió el municipio, queda «En curso». Los tickets diarios del relleno quedan como «Informativo» y no generan aviso.
   - **Manifolds**: se detectan por un adjunto o un asunto que diga «manifold N». Entran como «Abierto» para que revises el motivo y el plazo.
   - **Revisiones técnicas**: se detectan por el asunto «Revisión Técnica M-922». El certificado PDF se lee, con OCR si es escaneado; la fecha «válida hasta» se carga en Flota y la imagen se guarda en `docs/fotos/`.
2. **Regenera los datos y la app** (`datos/operacion.js` y `datos/construir_app.js`). Lo curado a mano en `datos/operacion.js` siempre manda sobre lo automático (`datos/auto/gmail.json`).
3. **Calcula las alertas** (`acciones/alertas.js`). Es el mismo cálculo que muestra la app: OC atrasadas, facturas y pagos fuera de plazo, RT por vencer, manifolds vencidos y correos urgentes.
4. **Envía un solo correo, y solo si hay algo nuevo.** Recibes novedades de Gmail más las alertas que no se habían avisado (`datos/auto/avisados.json`). Si no hay nada nuevo, no llega correo.

## Activación (una sola vez)

| Paso | Dónde | Qué |
|---|---|---|
| 1 | Cuenta de Google → Seguridad → Verificación en 2 pasos → **Contraseñas de aplicaciones** | Crear una llamada «Control Cosemar» y copiar las 16 letras |
| 2 | GitHub → repo → Settings → Secrets and variables → Actions → New repository secret | `GMAIL_USUARIO` (tu Gmail), `GMAIL_CLAVE_APP` (las 16 letras), `AVISOS_PARA` (tu Gmail), `AVISOS_CC` (el correo institucional) |
| 3 | GitHub → repo → Settings → General → Danger zone → Change visibility | Público, para que el enlace de la app abra sin cuenta |
| 4 | GitHub → repo → Settings → Pages | Source: *Deploy from a branch* · Branch `main` · carpeta `/docs` |
| 5 | GitHub → Actions → «Actualizar app Cosemar» → Run workflow | Primera corrida: llega un correo con las alertas abiertas |

Sin secretos la app igual se reconstruye cada hora; solo se omiten la lectura de Gmail y el correo.

## Mantención
- **Corregir o completar algo** (motivo de un manifold, estado de un correo): editar la fila en `datos/operacion.js`. Lo curado manda.
- **Nuevo proceso sancionatorio**: agregarlo en `datos/catalogo.js` (`sanciones`) y sus hitos en `datos/libro_novedades.json`.
