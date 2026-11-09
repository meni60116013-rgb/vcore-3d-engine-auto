# Límites técnicos y siguiente hoja de ruta

## Alcance confirmado en esta versión

- Tres sólidos paramétricos básicos.
- Transformaciones rígidas por componente (traslación y rotación).
- Selección desde el árbol y el visor 3D, edición validada y duplicación con desplazamiento automático.
- Filtro de candidatos mediante AABB rotadas y barrido en X (sweep-and-prune); calcula límites una vez por pieza, conserva el orden de pares y puede producir falsos positivos. No confirma colisiones reales.
- Masa y volumen analíticos para las tres geometrías.
- Densidades nominales seleccionables.
- Persistencia local, JSON y STL.
- Validación de entradas y versiones de ensamblaje.
- Pruebas unitarias, pruebas funcionales Chromium y recarga offline posterior a la primera carga online.
- Restricciones coincidente/distancia entre orígenes, evaluación de residual y solucionador iterativo de traslación con anclajes; informa conflictos no convergentes. JSON v2 con lectura compatible de v1.
- Paquete de código fuente generado por GitHub Actions.

## No implementado / no certificado

- Validación física en dispositivos Android reales y pruebas en una gama amplia de navegadores.
- Solver CAD paramétrico completo: el solucionador actual solo traslada orígenes para cumplir distancias/coincidencias; no resuelve rotaciones, caras, ejes, planos ni restricciones geométricas de sólidos.
- Restricciones concéntricas, paralelas y angulares.
- Detección de colisiones e interferencias.
- B-rep, superficies NURBS y operaciones booleanas robustas.
- STEP, IGES, Parasolid y otros formatos CAD sólidos.
- Mallado FEM, condiciones de frontera, solver FEA, convergencia y validación experimental.
- Fatiga, pandeo, vibración, térmica y dinámica.
- BOM de fabricación, tolerancias GD&T, planos 2D y G-code.

## Próximas fases recomendadas

1. Validación manual controlada en Android: instalación PWA, interacción táctil, memoria, rotación de pantalla y exportación/descarga.
2. Reducir falsos positivos del filtro AABB e incorporar pruebas con geometrías y rotaciones adicionales; mantenerlo como filtro preliminar.
3. Incorporar agrupaciones y restricciones de ensamblaje.
4. Incorporar biblioteca de perfiles normalizados y materiales con fuente/versión.
5. Integrar un kernel CAD real antes de prometer STEP o modelado sólido avanzado.
6. Incorporar FEA solo con solver apropiado, trazabilidad de unidades, mallado y casos de validación.
