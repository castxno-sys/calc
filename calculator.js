/*
 * Lógica pura de la calculadora: evalúa una lista de tokens
 * [número, operador, número, ...] respetando la precedencia (× ÷ antes que + −).
 */
(function (global) {
  const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

  function apply(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) throw new Error('División entre cero');
        return a / b;
    }
    throw new Error('Operador desconocido: ' + op);
  }

  function evaluate(tokens) {
    const values = [];
    const ops = [];
    const reduce = () => {
      const b = values.pop();
      const a = values.pop();
      values.push(apply(a, ops.pop(), b));
    };

    tokens.forEach((token, i) => {
      if (i % 2 === 0) {
        values.push(Number(token));
      } else {
        while (ops.length && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[token]) reduce();
        ops.push(token);
      }
    });
    while (ops.length) reduce();

    // Evita artefactos de coma flotante como 0.1 + 0.2 = 0.30000000000000004
    return Number.parseFloat(values[0].toPrecision(12));
  }

  global.Calculator = { evaluate };
  if (typeof module !== 'undefined') module.exports = global.Calculator;
})(typeof window !== 'undefined' ? window : globalThis);
