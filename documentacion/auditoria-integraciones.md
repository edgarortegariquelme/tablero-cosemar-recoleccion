# Auditoría de integraciones DMAO · 18 de noviembre de 2026

## Evidencia de origen

Se verificó la rama principal del repositorio privado en el commit `7f4509b68bd5b6fa8c25988d4363912aaae3567d`. Los seis JSON generados desde ese commit coincidieron byte por byte con los exportados, incluidos los tres duplicados de entrega. Se corrigieron en la página técnica de Notion las dos instrucciones obsoletas sobre crear el repositorio y se releyó el cambio.

Una consulta agregada del Libro de control devolvió 161 filas, 161 vigentes, 161 claves distintas y cero claves vacías. El recuento verifica la estructura del libro. La validez administrativa de cada antecedente requiere su documento original.

El proyecto Cloud devolvió HTTP 401 al consultar la lista de flujos desde este entorno. La cifra 33/20 corresponde al inventario anterior. La página JGL documenta 21 controles verificados y cero duplicados en la ejecución 126. La página CGE documenta WF01 y WF03 y la repetición 173 sin altas. Se revisaron esos registros documentales. Falta cotejar versiones, carpetas, ejecuciones y equivalencias con los flujos actuales de Cloud.

## Responsables y fuentes

| Tipo | Sistema responsable | Control |
|---|---|---|
| Código, generadores, pruebas, revisión y recuperación | GitHub | Cambio en rama y revisión de la versión antes de publicar |
| Planificación, llamadas a APIs y validación del resultado | n8n | ID de ejecución, versión de flujo y comprobación del efecto |
| Estado, hitos y evidencia administrativa | Notion | Clave, vigencia, versión, referencia al documento original |
| Originales y planillas oficiales | Drive | Referencia al archivo y revisión del período |

El diseño maestro y el secretario existentes siguen siendo los puntos de entrada municipales. Edgar AI OS ya documenta un ejecutor técnico y la revisión por una segunda IA. JGL documenta una aprobación con identidad y caducidad. El piloto manual de esta rama permite comprobar claves Cosemar con asignación, ejecución, recálculo y cierre. El auditor usa la misma entrada original y otro cálculo. Todo el piloto comparte un flujo y una identidad técnica. La independencia de permisos y la equivalencia con automatizaciones de Cloud quedan pendientes de inspección.

## Verificación del candidato

Se importaron de nuevo los tres flujos de prueba generados por esta rama en un directorio vacío de n8n 2.47.7. La ejecución del 2026-11-18T03:45:46.760Z obtuvo 12/12 aprobadas con Notion, Drive y correo simulados en loopback. P07 inyectó una respuesta 503, verificó que el fallo quedara abierto y confirmó por relectura el alta posterior y el cierre tras reproceso. Se eliminó la repetición automática de escrituras con resultado incierto.

| Comprobación | Resultado observado |
|---|---|
| Motor y tablero | 161 entradas de semilla y 161 claves. Tablero y borrador renderizaron cinco SVG cada uno, sin controles pendientes de dibujo ni errores. |
| Despliegue | Siete configuraciones rechazadas antes de escribir. La activación simulada se detuvo ante un fallo intermedio y reanudó las versiones pendientes. |
| Paginación | En n8n local se registraron dos solicitudes a cada una de las tres fuentes. El control rechaza respuestas incompletas y conserva el último corte válido. |
| Rectificación | Fallo de creación, fallo de baja, recuperación y repetición comprobados. |
| Avisos | Reserva parcial, correlación por lote, falta de comprobante, confirmación y repetición incierta comprobadas. |
| Piloto de roles | Cinco pruebas aprobadas. Ejecución manual real de seis nodos en n8n local. Una discrepancia entre auditor y ejecutor impide el cierre. |

Para reproducir, ejecutar `npm run build:n8n`, `npm run test:motor`, `npm run test:tablero` y `node pruebas/harness_borrador.js`. Las regresiones específicas se ejecutan con `node --test pruebas/despliegue_seguro.js pruebas/avisos_entrega.js pruebas/rectificaciones.js pruebas/paginacion.js pruebas/piloto_roles.js`. Para las integrales, iniciar el simulador, importar y publicar únicamente los tres JSON de `n8n/prueba` en una instancia local aislada y ejecutar `npm run test:e2e`. El arnés genera hora, criterio, resultado y evidencia por caso en `pruebas/resultados_e2e.json`.

## Antes de publicar

1. Restablecer acceso de lectura mediante una sesión autorizada. Cualquier cambio de credencial o permiso requiere aprobación. Obtener el inventario por proyecto y contrastar nombres, ID, versiones publicadas, carpetas, propietarios y ejecuciones recientes. Verificar también los escritores externos al proyecto.
2. Verificar en borrador los destinos de Notion y Drive, permisos de las credenciales, autenticación de los tres webhooks, cuenta de envío e identidad del destinatario. Un ID de credencial en un JSON solo indica una referencia.
3. Demostrar con disparos solapados que cada clave y cada aviso tienen un solo escritor efectivo. La deduplicación por lectura previa de Notion deja una carrera entre dos ejecuciones. Probar una reserva atómica o una cola compartida por todos los escritores y su recuperación. Considerar que el reproceso llama a ingesta y espera su respuesta.
4. Registrar versión actual y recuperar una exportación del borrador antes de reemplazarlo. Reservar una ventana sin ediciones simultáneas: el PUT de n8n carece de comparación atómica de versiones. Conservar el manifiesto de la importación. La activación verifica el proyecto, el nombre y la versión del manifiesto, y se detiene ante un fallo. Una operación que falla a la mitad requiere releer Cloud y conciliar los IDs antes de reintentar.
5. Presentar a Edgar las versiones y los efectos de publicación para su aprobación. Después de una publicación autorizada, comparar la salida con una relectura de Notion y los documentos de Drive. Para comunicaciones, solicitar la autorización de envío correspondiente y conservar el ID del proveedor.

## Recuperación

- **Rectificaciones.** Confirmar la existencia de la sucesora y su referencia a la versión anterior antes de retirar la antigua. Una incidencia de cierre requiere releer ambas versiones. Conservar el historial.
- **Avisos.** Un lote pendiente se concilia por identificador de lote en la ejecución y en Enviados. Si Gmail aceptó el mensaje, conservar su ID. Si se descarta la entrega y hace falta reenviar, obtener autorización. Los avisos históricos sin comprobante solo acreditan lo que documenta su registro.
- **Reproceso.** Una respuesta de ingesta debe contener confirmación explícita. Las peticiones antiguas sin evento normalizado requieren revisión documental.
- **Reversión.** Antes de integrar la rama puede descartarse el cambio en GitHub. Para recuperar una versión desplegada, identificar el último ID y versión comprobados, preparar el borrador desde ese commit y solicitar aprobación para intervenir en producción. Conciliar efectos que ya llegaron a Notion o Gmail antes de cualquier nuevo envío.

## Fuentes

[Documentación Cosemar](https://app.notion.com/p/41b9e3e655c0814c99d9fbd4706e20a9) · [Libro](https://app.notion.com/p/41a9e3e655c08141b986d51c9090c499) · [Diseño maestro](https://app.notion.com/p/40c9e3e655c081969460da6acd2530d2) · [Edgar AI OS](https://app.notion.com/p/3da9e3e655c08184a3f9f83729b22556) · [JGL](https://app.notion.com/p/4169e3e655c0816f99d2e46e18cff294) · [CGE](https://app.notion.com/p/4179e3e655c081b8ab91d67c68f82f8f).
