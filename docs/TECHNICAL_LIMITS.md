# Límites técnicos y siguiente hoja de ruta

## Alcance confirmado en esta versión

- Tres sólidos paramétricos básicos.
- Transformaciones rígidas por componente (traslación y rotación).
- Masa y volumen analíticos para las tres geometrías.
- Densidades nominales seleccionables.
- Persistencia local, JSON y STL.
- Validación de entradas y pruebas unitarias.

## No implementado / no certificado

- Restricciones de ensamblaje (coincidente, concéntrica, paralela, distancia, ángulo).
- Detección de colisiones e interferencias.
- B-rep, superficies NURBS y operaciones booleanas robustas.
- STEP, IGES, Parasolid y otros formatos CAD sólidos.
- Mallado FEM, condiciones de frontera, solver FEA, convergencia y validación experimental.
- Fatiga, pandeo, vibración, térmica y dinámica.
- BOM de fabricación, tolerancias GD&T, planos 2D y G-code.

## Próximas fases recomendadas

1. Validar exportación STL en navegador real y añadir pruebas de geometría y límites.
2. Añadir edición de piezas existentes, duplicación, selección en viewport y agrupaciones.
3. Añadir detección de colisiones AABB como filtro inicial; no presentarla como análisis exacto.
4. Incorporar biblioteca de perfiles normalizados y materiales con fuente/versión.
5. Integrar un kernel CAD real antes de prometer STEP o modelado sólido avanzado.
6. Incorporar FEA solo con solver apropiado, trazabilidad de unidades, mallado y casos de validación.
