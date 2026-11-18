# Control manual de claves vigentes de Cosemar

El piloto acepta una solicitud de diagnóstico de Cosemar y entrega el número de registros vigentes, claves vacías y claves distintas con más de una versión vigente. La fuente para esta prueba es una instantánea en el nodo Solicitud. El ejemplo contiene dos filas ficticias de una misma clave y una sola versión vigente.

El líder identifica la operación y asigna la tarea al ejecutor. El ejecutor cuenta con un mapa de frecuencias. El auditor vuelve a leer la instantánea original y agrupa las claves ordenadas. El líder conserva ambos resultados en la salida de cierre. Una discrepancia exige revisión y una coincidencia con claves vacías o duplicadas deja hallazgos abiertos. Son funciones deterministas en un mismo flujo manual, con independencia de cálculo. Todos los nodos comparten el entorno de ejecución y la identidad de n8n.

Una operación distinta de comprobar claves queda en espera de aprobación humana. El piloto termina en ese estado y carece de nodos capaces de activar flujos, escribir sobre el libro o enviar mensajes. Las solicitudes para otros proyectos quedan fuera del alcance. La conexión de estos roles a proyectos existentes requiere revisar el inventario actual y las identidades reales en n8n Cloud.

## Reproducción local

Desde la raíz del repositorio, ejecutar `node n8n/piloto/generar.js` y `node --test pruebas/piloto_roles.js`. El JSON desactivado se puede importar a una instancia de prueba y ejecutar desde Inicio manual. Con n8n 2.47.7 también se puede ejecutar por CLI en un directorio de usuario aislado.

```sh
export N8N_USER_FOLDER="$(mktemp -d)"
export N8N_DIAGNOSTICS_ENABLED=false N8N_VERSION_NOTIFICATIONS_ENABLED=false
export N8N_RUNNERS_BROKER_PORT=5891 N8N_PORT=5890
export N8N_LISTEN_ADDRESS=127.0.0.1 N8N_RUNNERS_BROKER_LISTEN_ADDRESS=127.0.0.1
n8n import:workflow --input=n8n/piloto/roles.json
n8n execute --id=dmaoPilotoRoles01 --rawOutput
```

En la ejecución local del 18 de noviembre de 2026 se comprobaron los seis nodos, el estado final `completada` y la evidencia independiente de un registro vigente, cero claves vacías y cero claves duplicadas. El resultado se refiere exclusivamente a la instantánea sintética.
