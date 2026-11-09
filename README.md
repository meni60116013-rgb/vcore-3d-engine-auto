# VCORE 3D CAD Assembly

Aplicación web progresiva para crear ensamblajes paramétricos sencillos en milímetros.

## Funciones implementadas

- Geometrías base: tubo circular, eje cilíndrico y placa rectangular.
- Posición XYZ y rotación XYZ por componente.
- Materiales con densidades de referencia: acero al carbono, inoxidable 304, aluminio 6061, titanio, latón y cobre.
- Cálculo geométrico de volumen y masa estimada.
- Revisión de candidatos de solapamiento mediante AABB rotadas y barrido en X (sweep-and-prune); calcula límites una vez por pieza y descarta pares separados antes de evaluar Y/Z. Sigue siendo un filtro aproximado, no una detección exacta de colisiones.
- Árbol de piezas con selección, edición de parámetros, duplicación con separación automática, eliminación individual y vaciado del ensamblaje.
- Selección visual de componentes desde el árbol o directamente en el visor 3D.
- Guardado local en el navegador, recuperación del último guardado y exportación JSON.
- Exportación de ensamblaje a STL mediante Three.js.
- Controles de cámara orbital, zoom y adaptación a pantalla.
- Validación de dimensiones, coordenadas, identificadores y versiones de archivo.
- Service worker con caché del shell de la aplicación y de módulos Three.js fijados a versión.
- Pruebas unitarias y de contrato, pruebas funcionales Chromium de selección/edición/duplicación, exportaciones, persistencia, revisión AABB y recarga offline en GitHub Actions.

## Uso

Abrir la aplicación desde un servidor HTTPS o localhost. Añadir componentes, definir material, posición y rotación. Guardar el ensamblaje en el dispositivo o exportarlo como JSON/STL.

## Unidades y precisión

Las dimensiones se expresan en mm. El volumen se expresa en mm³. La masa se calcula con densidades nominales en kg/mm³ y se muestra en kg. Son estimaciones geométricas: no incluyen soldaduras, tolerancias, porosidad, tratamientos, tornillería ni propiedades certificadas de lote.

## Límites actuales

Este proyecto todavía no es un CAD/CAE industrial ni sustituye software de ingeniería certificado. No implementa restricciones paramétricas entre piezas, detección de interferencias, mallado, FEA, análisis de fatiga, simulación térmica, planos técnicos, STEP/IGES ni generación de G-code. STL es una malla de triángulos y no conserva historial paramétrico.

La interfaz importa Three.js y sus módulos desde un CDN. El service worker almacena la aplicación y los módulos externos después de una carga online satisfactoria. La prueba automatizada en Chromium verifica una recarga offline posterior. La primera instalación y primera carga siguen requiriendo conexión; esto no equivale a una instalación completamente autónoma sin red.

## Validación

- `npm test`: pruebas del motor geométrico y contratos básicos de interfaz.
- `npm run test:browser`: pruebas Chromium de geometrías, transformaciones, métricas, exportación JSON/STL, persistencia, rechazo de archivos incompatibles y recarga offline.
- GitHub Actions ejecuta ambas baterías, valida manifiestos y empaqueta el código fuente.
- Las pruebas Chromium en CI no sustituyen una validación física en teléfonos Android reales.

## Seguridad y alcance

Los proyectos guardados permanecen en el almacenamiento local del navegador. No se envían a un servidor. Exportar un archivo es una acción local del usuario.
