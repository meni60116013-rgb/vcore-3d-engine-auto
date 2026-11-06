# VCORE 3D CAD Assembly

Aplicación web progresiva para crear ensamblajes paramétricos sencillos en milímetros.

## Funciones implementadas

- Geometrías base: tubo circular, eje cilíndrico y placa rectangular.
- Posición XYZ y rotación XYZ por componente.
- Materiales con densidades de referencia: acero al carbono, inoxidable 304, aluminio 6061, titanio, latón y cobre.
- Cálculo geométrico de volumen y masa estimada.
- Árbol de piezas con eliminación individual.
- Guardado local en el navegador, importación desde el último guardado y exportación JSON.
- Exportación de ensamblaje a STL mediante Three.js.
- Controles de cámara orbital, zoom y adaptación a pantalla.
- Validación de dimensiones, coordenadas e identificadores.
- Pruebas automatizadas en Node.js y empaquetado de código fuente en GitHub Actions.

## Uso

Abrir la aplicación desde un servidor HTTPS o localhost. Añadir componentes, definir material, posición y rotación. Guardar el ensamblaje en el dispositivo o exportarlo como JSON/STL.

## Unidades y precisión

Las dimensiones se expresan en mm. El volumen se expresa en mm³. La masa se calcula con densidades nominales en kg/mm³ y se muestra en kg. Son estimaciones geométricas: no incluyen soldaduras, tolerancias, porosidad, tratamientos, tornillería ni propiedades certificadas de lote.

## Límites actuales

Este proyecto todavía no es un CAD/CAE industrial ni sustituye software de ingeniería certificado. No implementa restricciones paramétricas entre piezas, detección de interferencias, mallado, FEA, análisis de fatiga, simulación térmica, planos técnicos, STEP/IGES ni generación de G-code. STL es una malla de triángulos y no conserva historial paramétrico.

La interfaz importa Three.js y sus módulos desde un CDN. El service worker almacena la aplicación local; la visualización y exportación 3D requieren que las dependencias externas estén disponibles al menos durante la primera carga. No se debe interpretar esto como funcionamiento completamente desconectado.

## Validación

`npm test` ejecuta las pruebas del motor geométrico y los contratos básicos de interfaz. GitHub Actions valida sintaxis, pruebas, manifiestos y empaqueta únicamente los archivos de código necesarios.

## Seguridad y alcance

Los proyectos guardados permanecen en el almacenamiento local del navegador. No se envían a un servidor. Exportar un archivo es una acción local del usuario.
