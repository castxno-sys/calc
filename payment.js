/*
 * Validación de tarjeta y cobro SIMULADO.
 *
 * Los datos de la tarjeta nunca salen del navegador. Para cobrar de verdad,
 * reemplaza `charge()` por una pasarela como Stripe (ver README.md): nunca
 * envíes el número de tarjeta a tu propio servidor.
 */
(function (global) {
  const DECLINED_TEST_CARDS = ['4000000000000002'];

  function digitsOnly(value) {
    return String(value).replace(/\D/g, '');
  }

  // Algoritmo de Luhn (dígito verificador de las tarjetas)
  function luhnValid(number) {
    const digits = digitsOnly(number);
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  }

  function detectBrand(number) {
    const n = digitsOnly(number);
    if (/^4/.test(n)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    return '';
  }

  function formatNumber(number) {
    const n = digitsOnly(number).slice(0, 19);
    if (detectBrand(n) === 'amex') {
      return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(' ');
    }
    return n.replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(value) {
    const n = digitsOnly(value).slice(0, 4);
    return n.length > 2 ? n.slice(0, 2) + '/' + n.slice(2) : n;
  }

  function expiryValid(value, now = new Date()) {
    const m = /^(\d{2})\/(\d{2})$/.exec(value);
    if (!m) return false;
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) return false;
    // La tarjeta es válida hasta el último día del mes de vencimiento
    return new Date(year, month, 1) > now;
  }

  function cvvValid(cvv, number) {
    const len = detectBrand(number) === 'amex' ? 4 : 3;
    return new RegExp('^\\d{' + len + '}$').test(cvv);
  }

  function validate(card, now) {
    const errors = {};
    if (!card.name.trim()) errors.name = 'Ingresa el nombre del titular.';
    if (!luhnValid(card.number)) errors.number = 'Número de tarjeta inválido.';
    if (!expiryValid(card.exp, now)) errors.exp = 'Fecha de vencimiento inválida o expirada.';
    if (!cvvValid(card.cvv, card.number)) errors.cvv = 'CVV inválido.';
    return errors;
  }

  // Simula la llamada a la pasarela de pago
  function charge(card, amount) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const n = digitsOnly(card.number);
        if (DECLINED_TEST_CARDS.includes(n)) {
          reject(new Error('Tarjeta rechazada por el banco.'));
          return;
        }
        resolve({
          id: 'ch_' + Math.random().toString(36).slice(2, 12),
          amount,
          last4: n.slice(-4),
          brand: detectBrand(n) || 'tarjeta',
        });
      }, 1200);
    });
  }

  global.Payment = {
    digitsOnly, luhnValid, detectBrand, formatNumber, formatExpiry,
    expiryValid, cvvValid, validate, charge,
  };
  if (typeof module !== 'undefined') module.exports = global.Payment;
})(typeof window !== 'undefined' ? window : globalThis);
