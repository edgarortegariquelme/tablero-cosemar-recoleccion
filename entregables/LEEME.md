# Tablero Cosemar Recolección · entregables (17-11-2026)

- Tablero: https://claude.ai/artifact/FqSZ9xCaUeVFhjHQPZhtMG (privado hasta compartirlo desde su menú Compartir).
- Libro de control en Notion: «Cosemar · Libro de control», bajo Trazabilidad de trámites DMAO → Tablero Cosemar Recolección.
- Matriz de obligaciones: `Matriz_obligaciones_Cosemar_3447-86-LR23.xlsx` (40 obligaciones, vigencias por período, cobertura).
- Flujos n8n de producción: `cosemar_1_ingesta.json`, `cosemar_2_avisos.json`, `cosemar_3_reproceso.json`.
- Flujogramas: sección «Flujogramas» del tablero (monitoreo y fiscalización, pago mensual, proceso sancionatorio).

## Puesta en marcha: GitHub Actions (reemplaza a n8n Cloud desde el 18-11-2026)

n8n Cloud quedó descartado: la cuenta está en prueba (sin API pública y con el cupo de 1.000 ejecuciones agotado). Los mismos tres flujos corren ahora en GitHub Actions (`.github/workflows/cosemar-flujos.yml`), con el código de los nodos de `n8n/produccion/*.json` ejecutado por `acciones/ejecutor.js`:

| Proceso | Cuándo | Qué hace |
|---|---|---|
| Ingesta | cada hora, minuto 07 | Lee el libro, Drive (si hay credencial) y «Comunicaciones»; valida, deduplica, rectifica y marca la sincronización |
| Avisos | lun–sáb 11:10 UTC (08:10 Chile en verano, 07:10 en invierno) | Un solo correo con los avisos nuevos; cada evento se avisa una vez |
| Reproceso | cada 6 horas, minuto 37 | Reintenta las escrituras fallidas y cierra los errores resueltos |

También se ejecutan a mano: pestaña **Actions → Flujos Cosemar → Run workflow** (proceso `revisar` solo informa qué secreto falta; en `ingesta` se puede pegar un JSON `{"eventos":[...]}` igual que el antiguo webhook).

### Secretos (repositorio → Settings → Secrets and variables → Actions → New repository secret)

1. `NOTION_TOKEN` (obligatorio; también lo usa la actualización horaria de la app). En notion.so/profile/integrations cree una integración interna y copie su secreto. Luego, en Notion, abra la base «Cosemar · Libro de control» → menú ••• → **Connections** → agregue la integración; repita en la base «Comunicaciones».
2. `GMAIL_USUARIO` (la cuenta Gmail que envía), `GMAIL_CLAVE_APP` (contraseña de aplicación de 16 letras: myaccount.google.com/apppasswords, requiere verificación en dos pasos) y `AVISOS_PARA` (destinatario). `AVISOS_CC` es opcional.
3. `GOOGLE_SA_JSON` (opcional): JSON de una cuenta de servicio de Google Cloud con la API de Drive habilitada, y las 7 carpetas del expediente compartidas con el correo de esa cuenta en modo lector. Sin este secreto la ingesta omite Drive y lo deja dicho en el resumen de cada corrida.

Sin `NOTION_TOKEN` nada se ejecuta; sin los secretos de Gmail los avisos no se registran (para no marcarlos como enviados sin haberlos enviado).

Antes del primer correo: los 7 hallazgos antiguos (PS01–PS06, REQ07) saldrán como «Hallazgo nuevo» porque aún no hay filas «Aviso» en el libro.

### Alternativa n8n (conservada)

Los JSON `cosemar_1_ingesta.json`, `cosemar_2_avisos.json` y `cosemar_3_reproceso.json` siguen sirviendo para un n8n con plan pagado: importar, asignar las credenciales «Notion API», «Google Drive OAuth2» y «Gmail OAuth2», reemplazar `CORREO_AVISOS` en el nodo «Config» y activar.

## Pruebas ejecutadas (API de Notion y Drive simulada; 12/12 aprobadas en n8n 2.47.7 local el 17-11 y 12/12 con `acciones/ejecutor.js` el 18-11, `pruebas/resultados_e2e_acciones.json`)

| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| P01 | Corrida sin novedades lee 161 filas en 2 páginas, no escribe y marca la sincronización | Aprobada | escritos 0, marca «Última actualización exitosa» |
| P02 | Archivo nuevo en la carpeta de octubre actualiza el pago sin intervención | Aprobada | 2026-10: «OC solicitada» → «OC emitida», origen `drive:drv-OC-oct` |
| P03 | El mismo documento no entra dos veces (Drive y reenvío) | Aprobada | omitidos 1, duplicado 1, 1 fila con la clave |
| P04 | Rectificación crea versión 2 y conserva la 1 | Aprobada | v1 vigente=false $261.767.423; v2 $267.940.006; diferencia de octubre 6.172.583 → 0 |
| P05 | Documento ambiguo va a revisión; disposición final se omite | Aprobada | revisión 1, omitidos 1, estados sin cambio |
| P06 | Dato inválido se rechaza con motivo | Aprobada | «fecha inválida: 2026-13-45; monto inválido: -5» |
| P07 | Falla temporal (3 × 503) queda registrada y el reproceso la completa | Aprobada | error «Por verificar» → «Acreditado»; pago 2026-10 «OC aceptada» |
| P08 | Drive caído: no marca exitosa; la siguiente corrida se recupera | Aprobada | «Último intento con errores» → siguiente exito=true |
| P09 | Decreto sin respaldo no avanza; con respaldo y notificación calcula reposición | Aprobada | notificación 12-11 → vence 20-11-2026, 4 días hábiles |
| P10 | Derivar a cobro ≠ cobrar; descuento contado una vez aunque llegue 3 veces | Aprobada | derivado $4.193.340, cobrado null → cobrado $4.193.340, 1 fila |
| P11 | Avisos en un solo mensaje y una vez por evento | Aprobada | 13 avisos, 1 correo; 2.ª corrida «Sin avisos nuevos» |
| P12 | Un vencido nuevo genera un único aviso adicional | Aprobada | 2.º correo con 1 aviso «VENCIDO: Revisión técnica … M-940» |
| T1 | Página del tablero en su entorno real con datos de Notion | Aprobada | control del tablero «passed» (11:46 y 11:50, 17-11) |
| T2 | Todas las secciones en arnés jsdom + d3 con el libro real | Aprobada | 0 errores; ficha PS05, pago 2026-09, garantía, flota, matriz, flujos |
| T3 | Libro resultante de n8n mostrado por el tablero | Aprobada | diferencia por decreto $24.690.332 → $18.517.749; PS05 cobrado con estado de pago |

Los datos marcados «(PRUEBA)» existieron solo en la API simulada; el libro real de Notion no recibió datos de prueba.
