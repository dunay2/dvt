/** Owned concern: localized copy for the operator form component. */
export const operatorFormCopy = {
  en: {
    field: 'Field',
    priority: 'Keys in priority order',
    direction: 'Direction and nulls',
    removeKey: 'Remove key',
    addKey: 'Add key',
    unlimited: 'Unlimited',
    comparison: 'Comparison',
    value: 'Text value',
    result: 'Result name',
    invalid:
      'Check fields and values. Duplicate keys, negatives, fractions, and i64 overflow are not admitted.',
    remove: 'Remove operation',
    cancel: 'Cancel',
    done: 'Done',
    description: 'On the current model output. Changes remain in the draft.',
  },
  es: {
    field: 'Campo',
    priority: 'Claves en orden de prioridad',
    direction: 'Dirección y nulos',
    removeKey: 'Quitar clave',
    addKey: 'Añadir clave',
    unlimited: 'Sin límite',
    comparison: 'Comparación',
    value: 'Valor de texto',
    result: 'Nombre del resultado',
    invalid:
      'Revisa los campos y valores. No se admiten claves repetidas, negativos, fracciones ni overflow i64.',
    remove: 'Retirar operación',
    cancel: 'Cancelar',
    done: 'Aceptar',
    description: 'Sobre la salida actual del modelo. Los cambios permanecen en el borrador.',
  },
};

export type OperatorFormCopy = typeof operatorFormCopy.en;
