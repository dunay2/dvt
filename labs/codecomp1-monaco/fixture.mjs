/** Explicit laboratory references; these are not analyzer-produced DVT bindings. */
const firstPrefix = [
  '-- Laboratorio: código y referencias gráficas en el mismo documento',
  'SELECT',
  '  c.cliente_id,',
  '  c.nombre,',
  '  p.pedido_id,',
  '  p.importe',
  'FROM ',
].join('\n');
const firstSource = 'ClientesActivos';
const between = ' AS c\nINNER JOIN ';
const secondSource = 'PedidosRecientes';
const suffix = [
  ' AS p',
  '  ON p.cliente_id = c.cliente_id',
  'WHERE p.importe > 0',
  'ORDER BY c.nombre, p.pedido_id;',
].join('\n');
const firstOffset = firstPrefix.length;
const secondOffset = firstOffset + firstSource.length + between.length;
const customerColumns = [
  { name: 'cliente_id', type: 'integer' },
  { name: 'nombre', type: 'text' },
];
const orderColumns = [
  { name: 'pedido_id', type: 'integer' },
  { name: 'cliente_id', type: 'integer' },
  { name: 'importe', type: 'decimal' },
];

export const fixture = {
  path: 'lab:///models/ventas_por_cliente.sql',
  sql: firstPrefix + firstSource + between + secondSource + suffix,
  references: [
    {
      id: 'lab-reference-clientes-activos',
      name: 'ClientesActivos',
      type: 'Modelo de laboratorio',
      startOffset: firstOffset,
      endOffset: firstOffset + firstSource.length,
      referenceSource: firstSource,
      inputs: [
        { name: 'Clientes', columns: [...customerColumns, { name: 'activo', type: 'boolean' }] },
      ],
      output: { name: 'ClientesActivos', columns: customerColumns },
      definition: 'SELECT cliente_id, nombre\nFROM Clientes\nWHERE activo = TRUE;',
    },
    {
      id: 'lab-reference-pedidos-recientes',
      name: 'PedidosRecientes',
      type: 'Modelo de laboratorio',
      startOffset: secondOffset,
      endOffset: secondOffset + secondSource.length,
      referenceSource: secondSource,
      inputs: [{ name: 'Pedidos', columns: [...orderColumns, { name: 'fecha', type: 'date' }] }],
      output: { name: 'PedidosRecientes', columns: orderColumns },
      definition:
        "SELECT pedido_id, cliente_id, importe\nFROM Pedidos\nWHERE fecha >= DATE '2026-10-01';",
    },
  ],
};
