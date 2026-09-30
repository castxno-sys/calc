(function () {
  const FEE = 0.99;
  const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const OP_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  const $ = (id) => document.getElementById(id);
  const els = {
    value: $('value'),
    expression: $('expression'),
    keys: document.querySelector('.keys'),
    history: $('history-list'),
    total: $('total-charged'),
    overlay: $('overlay'),
    form: $('pay-form'),
    payBtn: $('pay-btn'),
    error: $('pay-error'),
    name: $('card-name'),
    number: $('card-number'),
    exp: $('card-exp'),
    cvv: $('card-cvv'),
    preview: $('card-preview'),
  };

  // Estado de la calculadora
  let tokens = [];      // [número, op, número, op, ...] ya confirmados
  let current = '0';    // número que se está escribiendo
  let justPaid = false; // el display muestra un resultado pagado
  let pending = null;   // { tokens, text } esperando pago
  let totalCharged = 0;

  $('fee-label').textContent = CURRENCY.format(FEE);

  function expressionText(list) {
    return list.map((t, i) => (i % 2 ? OP_SYMBOLS[t] : t)).join(' ');
  }

  function render() {
    els.value.textContent = current;
    els.value.classList.toggle('locked', !!pending);
    els.expression.textContent = pending
      ? pending.text + ' = ?'
      : expressionText(tokens);
    document.querySelectorAll('.key.op').forEach((k) => {
      k.classList.toggle('active', current === '' && tokens[tokens.length - 1] === k.dataset.op);
    });
  }

  // ---- Entrada de la calculadora ----

  function inputDigit(d) {
    if (justPaid) { tokens = []; current = '0'; justPaid = false; }
    if (current === '0') current = d;
    else if (current.replace(/[-.]/g, '').length < 15) current += d;
  }

  function inputDecimal() {
    if (justPaid) { tokens = []; current = '0'; justPaid = false; }
    if (current === '') current = '0';
    if (!current.includes('.')) current += '.';
  }

  function inputOperator(op) {
    justPaid = false;
    if (current === '') {
      // Cambiar el último operador
      if (tokens.length) tokens[tokens.length - 1] = op;
      return;
    }
    tokens.push(normalize(current), op);
    current = '';
  }

  function normalize(n) {
    return n.endsWith('.') ? n.slice(0, -1) : n;
  }

  function clearAll() {
    tokens = [];
    current = '0';
    justPaid = false;
  }

  function backspace() {
    if (justPaid) return clearAll();
    if (current === '') {
      // Quitar el operador y volver a editar el número anterior
      if (tokens.length) { tokens.pop(); current = tokens.pop(); }
      return;
    }
    current = current.length > 1 ? current.slice(0, -1) : '0';
    if (current === '-') current = '0';
  }

  function percent() {
    if (current === '' || current === '0') return;
    current = String(Number.parseFloat((Number(current) / 100).toPrecision(12)));
    justPaid = false;
  }

  function requestResult() {
    const list = current === '' ? tokens.slice(0, -1) : tokens.concat(normalize(current));
    if (list.length < 3) return; // nada que calcular
    pending = { tokens: list, text: expressionText(list) };
    openPayment();
  }

  // ---- Pago ----

  function openPayment() {
    $('pay-expression').textContent = pending.text;
    $('pay-amount').textContent = CURRENCY.format(FEE);
    els.payBtn.textContent = 'Pagar ' + CURRENCY.format(FEE);
    setError('');
    els.overlay.hidden = false;
    render();
    els.name.focus();
  }

  function closePayment() {
    els.overlay.hidden = true;
    pending = null;
    render();
  }

  function setError(msg, ok) {
    els.error.textContent = msg;
    els.error.classList.toggle('success', !!ok);
  }

  function readCard() {
    return {
      name: els.name.value,
      number: els.number.value,
      exp: els.exp.value,
      cvv: els.cvv.value,
    };
  }

  function updatePreview() {
    const brand = Payment.detectBrand(els.number.value);
    els.preview.className = 'card-preview ' + brand;
    $('card-brand').textContent = brand ? brand.toUpperCase() : 'TARJETA';
    $('card-number-preview').textContent = els.number.value || '•••• •••• •••• ••••';
    $('card-name-preview').textContent = els.name.value || 'NOMBRE DEL TITULAR';
    $('card-exp-preview').textContent = els.exp.value || 'MM/AA';
  }

  els.number.addEventListener('input', () => {
    els.number.value = Payment.formatNumber(els.number.value);
    updatePreview();
  });
  els.exp.addEventListener('input', () => {
    els.exp.value = Payment.formatExpiry(els.exp.value);
    updatePreview();
  });
  els.cvv.addEventListener('input', () => {
    els.cvv.value = Payment.digitsOnly(els.cvv.value).slice(0, 4);
  });
  els.name.addEventListener('input', updatePreview);

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const card = readCard();
    const errors = Payment.validate(card);
    ['name', 'number', 'exp', 'cvv'].forEach((f) => els[f].classList.toggle('invalid', !!errors[f]));
    const first = Object.values(errors)[0];
    if (first) return setError(first);

    setError('');
    els.payBtn.disabled = true;
    els.payBtn.textContent = 'Procesando…';
    try {
      const receipt = await Payment.charge(card, FEE);
      let result;
      try {
        result = String(Calculator.evaluate(pending.tokens));
      } catch (err) {
        result = 'Error';
      }
      addHistory(pending.text, result, receipt);
      tokens = [];
      current = result === 'Error' ? '0' : result;
      justPaid = true;
      pending = null;
      els.overlay.hidden = true;
      els.expression.textContent = '';
      render();
      if (result === 'Error') els.value.textContent = 'Error';
    } catch (err) {
      setError(err.message);
    } finally {
      els.payBtn.disabled = false;
      els.payBtn.textContent = 'Pagar ' + CURRENCY.format(FEE);
    }
  });

  function addHistory(expr, result, receipt) {
    const empty = els.history.querySelector('.empty');
    if (empty) empty.remove();
    totalCharged += receipt.amount;
    els.total.textContent = CURRENCY.format(totalCharged);

    const li = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = expr + ' = ' + result;
    const right = document.createElement('span');
    right.textContent = CURRENCY.format(receipt.amount) + ' · ' + receipt.brand + ' •••• ' + receipt.last4;
    li.append(left, right);
    els.history.prepend(li);
  }

  $('close-modal').addEventListener('click', closePayment);
  els.overlay.addEventListener('click', (e) => { if (e.target === els.overlay) closePayment(); });

  // ---- Eventos de la calculadora ----

  els.keys.addEventListener('click', (e) => {
    const key = e.target.closest('button');
    if (!key) return;
    handle(key.dataset);
  });

  function handle({ digit, op, action }) {
    if (pending) return;
    if (digit) inputDigit(digit);
    else if (op) inputOperator(op);
    else if (action === 'decimal') inputDecimal();
    else if (action === 'clear') clearAll();
    else if (action === 'backspace') backspace();
    else if (action === 'percent') percent();
    else if (action === 'equals') return requestResult();
    render();
  }

  document.addEventListener('keydown', (e) => {
    if (!els.overlay.hidden) {
      if (e.key === 'Escape') closePayment();
      return;
    }
    const k = e.key;
    if (/^\d$/.test(k)) handle({ digit: k });
    else if ('+-*/'.includes(k)) handle({ op: k });
    else if (k === '.' || k === ',') handle({ action: 'decimal' });
    else if (k === 'Enter' || k === '=') { e.preventDefault(); handle({ action: 'equals' }); }
    else if (k === 'Backspace') handle({ action: 'backspace' });
    else if (k === 'Escape') handle({ action: 'clear' });
    else if (k === '%') handle({ action: 'percent' });
  });

  const empty = document.createElement('li');
  empty.className = 'empty';
  empty.textContent = 'Aún no hay resultados pagados.';
  els.history.append(empty);

  render();
})();
