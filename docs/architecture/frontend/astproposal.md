## Introduccion

Ventajas:

- mas legible para humanos
- mas cercano a pasos de ejecucion
- mejor narrativa

Desventaja:

- puede ocultar la estructura del grafo
- puede derivar en un pseudo-lenguaje procedural

Mi recomendacion:

Para Raven Plan, no iria a un DSL demasiado imperativo.

El nucleo del sistema sigue siendo:

- plan
- dependencias
- steps
- DAG

Entonces te interesa que el lenguaje revele el grafo, no que lo esconda.

Recomendacion concreta:

Usaria un DSL declarativo legible, con verbos simples.

Algo intermedio:

```text
source raw.orders
source raw.products

model base_orders:
from raw.orders

model base_products:
from raw.products

model mart_sales_daily:
from base_orders
from base_products

publish insights.ml_insights:
from mart_sales_daily
```

Eso es mas claro que la sintaxis anterior y sigue siendo muy grafico.

## Panel derecho: graph preview en tiempo real

Esto si lo veo obligatorio.

Que debe mostrar:

- nodos
- edges
- nodo seleccionado
- estado de parseo
- highlight del bloque actual

Comportamiento ideal:

Cuando el cursor esta en este bloque:

```text
model mart_sales_daily:
from base_orders
from base_products
```

En la derecha:

- se resalta `mart_sales_daily`
- se iluminan `base_orders` y `base_products`
- se marcan sus dependencias

Eso hace que la UX sea realmente poderosa.

## Bottom panel

Necesitas una zona inferior con pestanas.

Pestanas recomendadas:

- Problems
- Graph AST
- Compiled Plan
- Generated SQL
- Logs

Por que:

Porque esta pantalla no es solo de edicion. Es una pantalla de
authoring + compile + inspect.

## Modos de trabajo

Esta pantalla deberia admitir al menos 3 modos.

Mode: DSL

- Editas el DSL del grafo.

Mode: SQL

- Editas SQL asociado a un nodo o bloque.

Mode: Split

- Izquierda DSL y derecha SQL o preview.

## Que evitaria

No haria esto:

- un editor full-screen sin preview
- una preview estatica no interactiva
- un DSL demasiado "programacion general"
- sintaxis criptica tipo Cypher si no es estrictamente necesaria

Porque entonces pierdes legibilidad y proposito.

## Que deberia comunicar la pantalla

No es:

- "un IDE cualquiera"

Es:

- Graph Authoring Studio
- Plan Authoring + Visual Feedback
- DSL to DAG editor

## Conclusion

Tu intuicion es correcta.

La pantalla buena seria:

- izquierda: editor DSL y SQL
- derecha: preview del grafo
- abajo: errores, compiled plan, SQL, logs

Sobre el lenguaje, yo lo haria:

- mas claro
- mas legible
- mas declarativo que imperativo
- con verbos simples
- orientado a revelar dependencias
