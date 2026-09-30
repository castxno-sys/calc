// Ejecutar con: node tests/run.js
const assert = require('assert');
const Calculator = require('../calculator.js');
const Payment = require('../payment.js');

const cases = [
  ['precedencia', () => assert.strictEqual(Calculator.evaluate(['2', '+', '3', '*', '4']), 14)],
  ['izquierda a derecha', () => assert.strictEqual(Calculator.evaluate(['10', '-', '4', '-', '3']), 3)],
  ['flotantes', () => assert.strictEqual(Calculator.evaluate(['0.1', '+', '0.2']), 0.3)],
  ['división entre cero', () => assert.throws(() => Calculator.evaluate(['1', '/', '0']))],
  ['luhn válido', () => assert.ok(Payment.luhnValid('4242 4242 4242 4242'))],
  ['luhn inválido', () => assert.ok(!Payment.luhnValid('4242 4242 4242 4241'))],
  ['marca', () => {
    assert.strictEqual(Payment.detectBrand('4242'), 'visa');
    assert.strictEqual(Payment.detectBrand('5555'), 'mastercard');
    assert.strictEqual(Payment.detectBrand('3782'), 'amex');
  }],
  ['formato', () => {
    assert.strictEqual(Payment.formatNumber('4242424242424242'), '4242 4242 4242 4242');
    assert.strictEqual(Payment.formatNumber('378282246310005'), '3782 822463 10005');
    assert.strictEqual(Payment.formatExpiry('1229'), '12/29');
  }],
  ['vencimiento', () => {
    const now = new Date(2026, 8, 30);
    assert.ok(Payment.expiryValid('09/26', now));
    assert.ok(!Payment.expiryValid('08/26', now));
    assert.ok(!Payment.expiryValid('13/30', now));
  }],
  ['cvv', () => {
    assert.ok(Payment.cvvValid('123', '4242'));
    assert.ok(!Payment.cvvValid('123', '3782'));
    assert.ok(Payment.cvvValid('1234', '3782'));
  }],
  ['validate', () => {
    const errs = Payment.validate({ name: '', number: '1234', exp: '00/00', cvv: '' });
    assert.deepStrictEqual(Object.keys(errs).sort(), ['cvv', 'exp', 'name', 'number']);
  }],
];

let failed = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log('✓', name); } catch (e) { failed++; console.log('✗', name, '-', e.message); }
}
process.exit(failed ? 1 : 0);
