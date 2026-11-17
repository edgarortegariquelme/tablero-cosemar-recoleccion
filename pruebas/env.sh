# Variables para las pruebas locales. Ajustar N8N a la ruta del binario de n8n (requiere Node 24).
export N8=${N8:-$(command -v n8n)} N8N_USER_FOLDER=${N8N_USER_FOLDER:-$PWD/.n8n-prueba}
export N8N_DIAGNOSTICS_ENABLED=false N8N_VERSION_NOTIFICATIONS_ENABLED=false N8N_SECURE_COOKIE=false GENERIC_TIMEZONE=America/Santiago N8N_PORT=5678 N8N_LOG_LEVEL=warn
export N8N_LISTEN_ADDRESS=127.0.0.1 N8N_RUNNERS_BROKER_LISTEN_ADDRESS=127.0.0.1
