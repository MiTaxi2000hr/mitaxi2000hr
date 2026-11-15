# MiTaxi 2000HR — prototipo inicial

## Qué incluye
- Mapa OpenStreetMap centrado en Puebla.
- Selección de origen y destino haciendo clic.
- Ruta por carretera y distancia mediante OSRM.
- Tarifa de $14 MXN/km más base seleccionable entre $20 y $40.
- Compartir cotización por WhatsApp.
- Historial local de la sesión.

## Ejecutar localmente
Requiere Node.js 18 o superior.

```bash
npm install
npm run dev
```

## Publicar gratis en Vercel
1. Crear una cuenta en GitHub y un repositorio llamado `mitaxi2000hr`.
2. Subir todos los archivos de este proyecto al repositorio.
3. Crear una cuenta en Vercel e importar el repositorio.
4. Framework: Vite. Build command: `npm run build`. Output directory: `dist`.
5. Desplegar. Vercel generará una URL pública.

## Limitaciones importantes del prototipo
- El selector de perfil es solo demostrativo; NO es autenticación ni control de permisos.
- El historial solo vive en el navegador/sesión y no se comparte entre operadores.
- No hay base de datos ni registro de usuarios todavía.
- OSRM público es un servicio comunitario con límites y sin garantía de disponibilidad.
- El tiempo de ruta de OSRM NO representa tráfico en vivo. El prototipo lo etiqueta como estimación.
- Los mosaicos de OpenStreetMap tienen política de uso; para uso empresarial sostenido debe contratarse un proveedor de tiles o alojar infraestructura propia.
- Antes de producción, implementar autenticación real, permisos en servidor, base de datos, auditoría, protección de datos y proveedor de rutas/tiles con SLA adecuado.
- La tarifa actual implementada es km * 14 + base de $20 a $40. Confirmar reglas comerciales antes de usar para cobrar.

## Licencias y atribución
Mapa © OpenStreetMap contributors. Rutas calculadas mediante el servidor público de OSRM Project.
