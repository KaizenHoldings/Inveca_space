/**
 * Sanitiza los mensajes de error para evitar develar información sensible
 * de infraestructura a los usuarios finales (direcciones IP, puertos, nombres de hosts internos).
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado al procesar la solicitud.';
  }

  let message = typeof error === 'string' 
    ? error 
    : (error instanceof Error ? error.message : String(error));

  // 1. Mensajes amigables y seguros para fallos típicos de bases de datos
  if (
    message.includes('Failed to connect') || 
    message.includes('ETIMEDOUT') || 
    message.includes('ESOCKETTIMEDOUT') ||
    message.includes('timeout')
  ) {
    return 'No se pudo establecer conexión con el servidor de base de datos (tiempo de espera agotado). Verifique la conectividad de red.';
  }

  if (message.includes('ECONNREFUSED')) {
    return 'Conexión rechazada por el servidor de base de datos. Verifique que el servicio esté activo.';
  }

  if (message.includes('Login failed for user')) {
    return 'Error de autenticación con el servidor de base de datos. Verifique las credenciales configuradas.';
  }

  if (message.includes('Cannot open database')) {
    return 'No se pudo acceder a la base de datos solicitada en el servidor.';
  }

  if (message.includes('Connection lost') || message.includes('Connection closed')) {
    return 'Se perdió la conexión con el servidor de base de datos.';
  }

  // 2. Enmascarar cualquier dirección IPv4 (con o sin puerto) ej: 192.168.1.254:1433
  const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g;
  message = message.replace(ipv4Regex, '[servidor]');

  // 3. Enmascarar hosts internos comunes
  const internalHostsRegex = /\b(localhost|sql_server|notas_entrega_db|notas_entrega_web)(?::\d+)?\b/gi;
  message = message.replace(internalHostsRegex, '[servidor]');

  return message;
}
