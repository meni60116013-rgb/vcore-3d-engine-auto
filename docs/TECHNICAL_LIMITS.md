# Límites técnicos y siguiente hoja de ruta

## Alcance confirmado en esta versión

- Tres sólidos paramétricos básicos.
- Transformaciones rígidas por componente (traslación y rotación).
- Masa y volumen analíticos para las tres geometrías.
- Densidades nominales seleccionables.
- Persistencia local, JSON y STL.
- Validación de entradas y versiones de ensamblaje.
- Pruebas unitarias, pruebas funcionales Chromium y recarga offline posterior a la primera carga online.
- Paquete de código fuente generado por GitHub Actions.

## No implementado / no certificado

- Validación física en dispositivos Android reales y pruebas en una gama amplia de navegadores.
- Restricciones de ensamblaje (coincidente, concéntrica, paralela, distancia, ángulo).
- Detección de colisiones e interferencias.
- B-rep, superficies NURBS y operaciones booleanas robustas.
- STEP, IGES, Parasolid y otros formatos CAD sólidos.
- Mallado FEM, condiciones de frontera, solver FEA, convergencia y validación experimental.
- Fatiga, pandeo, vibración, térmica y dinámica.
- BOM de fabricación, tolerancias GD&T, planos 2D y G-code.

## Próximas fases recomendadas

1. Validación manual controlada en Android: instalación PWA, interacción táctil, memoria, rotación de pantalla y exportación/descarga.
2. Añadir edición de piezas existentes, duplicación, selección en viewport y agrupaciones.
3. Añadir detección de colisiones AABB como filtro inicial; no presentarla como análisis exacto.
4. Incorporar biblioteca de perfiles normalizados y materiales con fuente/versión.
5. Integrar un kernel CAD real antes de prometer STEP o modelado sólido avanzado.
6. Incorporar FEA solo con solver apropiado, trazabilidad de unidades, mallado y casos de validación.
