# Tablero Cosemar Recolección · entregables (17-11-2026)

- Tablero: https://claude.ai/artifact/FqSZ9xCaUeVFhjHQPZhtMG (privado hasta compartirlo desde su menú Compartir).
- Libro de control en Notion: «Cosemar · Libro de control», bajo Trazabilidad de trámites DMAO → Tablero Cosemar Recolección.
- Matriz de obligaciones: `Matriz_obligaciones_Cosemar_3447-86-LR23.xlsx` (40 obligaciones, vigencias por período, cobertura).
- Flujos n8n de producción: `cosemar_1_ingesta.json`, `cosemar_2_avisos.json`, `cosemar_3_reproceso.json`.
- Flujogramas: sección «Flujogramas» del tablero (monitoreo y fiscalización, pago mensual, proceso sancionatorio).

## Puesta en marcha en n8n (requiere su cuenta)

1. Importar los tres JSON (Workflows → Import from file).
2. Credenciales: «Notion API» (integración interna con acceso a la base «Cosemar · Libro de control» y a «Comunicaciones»), «Google Drive OAuth2» (lectura del expediente) y «Gmail OAuth2» (envío de avisos). Asignarlas en los nodos HTTP de Notion y Drive y en «Enviar aviso».
3. En el nodo «Config» revisar `avisosPara` (puesto como eortega@maho.cl, supuesto) e `ingestaUrl` (URL de su instancia).
4. Activar los tres flujos. La ingesta corre cada hora; avisos 08:10 lunes a sábado; reproceso cada 6 horas. También responden por webhook: `/webhook/cosemar/evento`, `/avisos`, `/reprocesar`.

## Pruebas ejecutadas (n8n 2.47.7 local con API de Notion y Drive simulada; 12/12 aprobadas, repetidas tras el reinicio del 17-11)

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
