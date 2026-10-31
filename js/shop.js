/* Little Harbour order system
   Orders are sent by email through FormSubmit (formsubmit.co); the customer pays by bank transfer.
   ---- Settings: change these to suit ---- */
const SHOP = {
  email: 'contactanthony@anthonyslittleharbourseries.co.uk',
  books: {
    oscar: { title: 'Oscar and the Little Harbour', price: 9.99 },
    noah:  { title: 'Noah and the Little Harbour',  price: 9.99 },
  },
  delivery: {
    post:    { label: 'UK post',                    first: 3.50, extra: 1.00 }, // first book, then each extra book
    collect: { label: 'Collect in Matlock (free)', first: 0,    extra: 0 },
  },
  maxPerBook: 20,
};
/* ---------------------------------------- */

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const gbp = n => '£' + n.toFixed(2);
  const STORE = 'lh-basket';

  let basket = {};
  try { basket = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { basket = {}; }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(basket)); } catch (e) {} };

  const count = () => Object.values(basket).reduce((a, b) => a + b, 0);
  const subtotal = () => Object.entries(basket).reduce((t, [id, q]) => t + (SHOP.books[id]?.price || 0) * q, 0);
  const method = () => ($('input[name="delivery"]:checked') || {}).value || 'post';
  const postage = () => { const n = count(), d = SHOP.delivery[method()]; return n ? d.first + d.extra * (n - 1) : 0; };

  /* ---- quantity steppers on the book cards ---- */
  $$('[data-qty]').forEach(q => {
    const out = $('output', q);
    q.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      out.value = Math.min(SHOP.maxPerBook, Math.max(1, +out.value + (+b.dataset.step)));
    });
  });

  $$('[data-add]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.add, q = +$('output', btn.closest('.buy')).value;
    basket[id] = Math.min(SHOP.maxPerBook, (basket[id] || 0) + q);
    save(); render();
    btn.textContent = 'Added ✓'; btn.classList.add('added');
    setTimeout(() => { btn.textContent = 'Add to basket'; btn.classList.remove('added'); }, 1600);
    const fab = $('.basket-fab'); fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
  }));

  /* ---- basket dialog ---- */
  const dlg = $('#basket');
  const open = () => { render(); showView('basket'); dlg.showModal(); };
  $$('[data-open-basket]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(); }));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  function showView(v) { $$('[data-view]', dlg).forEach(s => s.hidden = s.dataset.view !== v); }

  function render() {
    const n = count();
    $('.basket-fab').hidden = n === 0;
    $('.basket-fab .n').textContent = n;
    const list = $('#basket-lines');
    list.innerHTML = '';
    Object.entries(basket).forEach(([id, q]) => {
      const b = SHOP.books[id]; if (!b || !q) return;
      const li = document.createElement('li');
      li.innerHTML = `<img src="${$(`[data-cover="${id}"]`)?.getAttribute('src') || ''}" alt="">
        <div class="ln"><b>${b.title}</b><span>${gbp(b.price)} each</span></div>
        <div class="qty small" aria-label="Quantity"><button type="button" data-id="${id}" data-d="-1" aria-label="One fewer">−</button><output>${q}</output><button type="button" data-id="${id}" data-d="1" aria-label="One more">+</button></div>
        <span class="lt">${gbp(b.price * q)}</span>
        <button type="button" class="rm" data-rm="${id}" aria-label="Remove ${b.title}">✕</button>`;
      list.appendChild(li);
    });
    const empty = n === 0;
    $('#basket-empty').hidden = !empty;
    $('#basket-filled').hidden = empty;
    $('#t-sub').textContent = gbp(subtotal());
    $('#t-post').textContent = postage() ? gbp(postage()) : 'Free';
    $('#t-total').textContent = $('#t-total-2').textContent = gbp(subtotal() + postage());
    const d = SHOP.delivery.post;
    $('#post-price').textContent = `${gbp(d.first)}${d.extra ? `, +${gbp(d.extra)} each extra book` : ''}`;
    const post = method() === 'post';
    $('#address').hidden = !post;
    $$('#address [data-req]').forEach(i => i.required = post);
  }

  $('#basket-lines').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rm) delete basket[b.dataset.rm];
    if (b.dataset.d) {
      const v = (basket[b.dataset.id] || 0) + (+b.dataset.d);
      if (v <= 0) delete basket[b.dataset.id]; else basket[b.dataset.id] = Math.min(SHOP.maxPerBook, v);
    }
    save(); render();
  });
  $$('input[name="delivery"]').forEach(r => r.addEventListener('change', render));

  /* ---- sending ---- */
  const ref = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `LH-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  };

  async function send(payload, fallbackSubject) {
    const r = await fetch(`https://formsubmit.co/ajax/${SHOP.email}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || String(j.success) === 'false') throw new Error(j.message || 'send failed');
    return j;
  }

  function mailtoFallback(subject, body) {
    return `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  $('#order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (!count()) return;
    if (f._honey.value) return; // spam trap
    const r = ref(), post = method() === 'post';
    const lines = Object.entries(basket).map(([id, q]) => `${q} × ${SHOP.books[id].title} @ ${gbp(SHOP.books[id].price)} = ${gbp(SHOP.books[id].price * q)}`);
    const address = post ? [f.addr1.value, f.addr2.value, f.town.value, f.postcode.value.toUpperCase()].filter(Boolean).join(', ') : 'Collecting in Matlock';
    const summary = [...lines, `Delivery (${SHOP.delivery[method()].label}): ${postage() ? gbp(postage()) : 'Free'}`, `TOTAL: ${gbp(subtotal() + postage())}`].join('\n');
    const payload = {
      _subject: `New book order ${r}: ${gbp(subtotal() + postage())}`,
      _template: 'table',
      _captcha: 'false',
      _autoresponse: `Thank you for your order (${r}) from Anthony's Little Harbour Series!\n\n${summary}\n\nAnthony will email you shortly with bank details for payment by bank transfer (BACS). Please use ${r} as the payment reference. ${post ? 'Your books will be posted as soon as payment has cleared.' : "Anthony will let you know when your books are ready to collect in Matlock."}`,
      'Order reference': r,
      Name: f.name.value,
      email: f.email.value,
      Phone: f.phone.value || '—',
      Order: summary,
      Delivery: SHOP.delivery[method()].label,
      Address: address,
      Notes: f.notes.value || '—',
    };
    const btn = $('button[type="submit"]', f); btn.disabled = true; btn.textContent = 'Sending…';
    $('#order-error').hidden = true;
    try {
      await send(payload);
      $('#done-ref').textContent = r;
      $('#done-total').textContent = gbp(subtotal() + postage());
      $('#done-email').textContent = f.email.value;
      $('#done-next').textContent = post ? 'Your books will be posted as soon as the payment has cleared.' : "He'll let you know when they're ready to collect in Matlock.";
      basket = {}; save(); f.reset(); render(); showView('done');
    } catch (err) {
      const a = $('#order-error a');
      a.href = mailtoFallback(`Book order ${r}`, `Name: ${f.name.value}\nEmail: ${f.email.value}\nPhone: ${f.phone.value}\n\n${summary}\n\nDelivery address: ${address}\n\nNotes: ${f.notes.value}`);
      $('#order-error').hidden = false;
    } finally { btn.disabled = false; btn.textContent = 'Place order'; }
  });

  $('#to-checkout').addEventListener('click', () => { showView('checkout'); render(); $('#order-form [name="name"]').focus(); });
  $('#back-to-basket').addEventListener('click', () => showView('basket'));

  /* ---- trade enquiries ---- */
  const tdlg = $('#trade');
  $$('[data-open-trade]').forEach(b => b.addEventListener('click', () => { $('#trade-form').hidden = false; $('#trade-done').hidden = true; tdlg.showModal(); }));
  $('#trade-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target; if (f._honey.value) return;
    const wants = Object.keys(SHOP.books).map(id => `${SHOP.books[id].title}: ${f['q_' + id].value || 0}`).join('\n');
    const payload = {
      _subject: `Trade enquiry: ${f.business.value}`, _template: 'table', _captcha: 'false',
      _autoresponse: `Thank you for your trade enquiry. Anthony will be in touch soon about pricing and delivery.\n\n${wants}`,
      Business: f.business.value, 'Type of business': f.kind.value, 'Contact name': f.name.value,
      email: f.email.value, Phone: f.phone.value || '—', 'Copies wanted': wants, Message: f.message.value || '—',
    };
    const btn = $('button[type="submit"]', f); btn.disabled = true; btn.textContent = 'Sending…';
    $('#trade-error').hidden = true;
    try { await send(payload); f.reset(); f.hidden = true; $('#trade-done').hidden = false; }
    catch (err) {
      $('#trade-error a').href = mailtoFallback(`Trade enquiry: ${f.business.value}`, `${f.business.value} (${f.kind.value})\n${f.name.value}, ${f.email.value}, ${f.phone.value}\n\n${wants}\n\n${f.message.value}`);
      $('#trade-error').hidden = false;
    } finally { btn.disabled = false; btn.textContent = 'Send enquiry'; }
  });

  render();
})();
