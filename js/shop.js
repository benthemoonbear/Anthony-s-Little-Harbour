/* Little Harbour order system
   Orders are sent by email through FormSubmit (formsubmit.co); the customer pays by bank transfer.
   ---- Settings: change these to suit ---- */
const SHOP = {
  email: 'contactanthony@anthonyslittleharbourseries.co.uk',
  // Each format is its own item. PDF eBooks have no postage and are emailed by Anthony once payment clears.
  books: {
    'oscar':     { title: 'Oscar and the Little Harbour', format: 'Paperback', price: 9.99, cover: 'oscar' },
    'oscar-pdf': { title: 'Oscar and the Little Harbour', format: 'PDF eBook', price: 4.99, cover: 'oscar', digital: true },
    'noah':      { title: 'Noah and the Little Harbour',  format: 'Paperback', price: 9.99, cover: 'noah' },
    'noah-pdf':  { title: 'Noah and the Little Harbour',  format: 'PDF eBook', price: 4.99, cover: 'noah', digital: true },
  },
  delivery: { // for paperbacks only
    post:    { label: 'UK post',                    first: 3.50, extra: 1.00 }, // first paperback, then each extra paperback
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

  // drop anything no longer sold; PDFs are one copy each
  Object.keys(basket).forEach(id => { if (!SHOP.books[id] || !(basket[id] > 0)) delete basket[id]; else if (SHOP.books[id].digital) basket[id] = 1; });
  const items = () => Object.entries(basket).filter(([id, q]) => SHOP.books[id] && q > 0);
  const count = () => items().reduce((a, [, q]) => a + q, 0);
  const physical = () => items().filter(([id]) => !SHOP.books[id].digital).reduce((a, [, q]) => a + q, 0);
  const digital = () => items().some(([id]) => SHOP.books[id].digital);
  const name = id => `${SHOP.books[id].title} (${SHOP.books[id].format})`;
  const maxFor = id => SHOP.books[id].digital ? 1 : SHOP.maxPerBook;
  const subtotal = () => items().reduce((t, [id, q]) => t + SHOP.books[id].price * q, 0);
  const method = () => ($('input[name="delivery"]:checked') || {}).value || 'post';
  const postage = () => { const n = physical(), d = SHOP.delivery[method()]; return n ? d.first + d.extra * (n - 1) : 0; };
  const needsAddress = () => physical() > 0 && method() === 'post';

  /* ---- quantity steppers on the book cards ---- */
  const chosen = card => ($('input[type="radio"]:checked', card) || {}).value;
  $$('.book').forEach(card => {
    const sync = () => {
      const id = chosen(card); if (!id) return;
      const b = SHOP.books[id], out = $('[data-qty] output', card);
      $('.price', card).textContent = gbp(b.price);
      $$('[data-qty] button', card).forEach(x => x.disabled = !!b.digital);
      $('[data-qty]', card).classList.toggle('off', !!b.digital);
      if (b.digital) out.value = 1;
      const note = $('.fmt-note', card); if (note) note.hidden = !b.digital;
    };
    $$('input[type="radio"]', card).forEach(r => r.addEventListener('change', sync));
    $$('.formats [data-price]', card).forEach(el => el.textContent = gbp(SHOP.books[el.dataset.price].price));
    sync();
  });

  $$('[data-qty]').forEach(q => {
    const out = $('output', q);
    q.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      out.value = Math.min(SHOP.maxPerBook, Math.max(1, +out.value + (+b.dataset.step)));
    });
  });

  $$('[data-add]').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.book'), id = chosen(card) || btn.dataset.add, q = +$('output', btn.closest('.buy')).value;
    basket[id] = Math.min(maxFor(id), (basket[id] || 0) + q);
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
    items().forEach(([id, q]) => {
      const b = SHOP.books[id];
      const li = document.createElement('li');
      const qty = b.digital ? `<span class="tag-pdf">Emailed to you</span>`
        : `<div class="qty small" aria-label="Quantity"><button type="button" data-id="${id}" data-d="-1" aria-label="One fewer">−</button><output>${q}</output><button type="button" data-id="${id}" data-d="1" aria-label="One more">+</button></div>`;
      li.innerHTML = `<img src="${$(`[data-cover="${b.cover}"]`)?.getAttribute('src') || ''}" alt="">
        <div class="ln"><b>${b.title}</b><span>${b.format} · ${gbp(b.price)}${b.digital ? '' : ' each'}</span></div>
        ${qty}
        <span class="lt">${gbp(b.price * q)}</span>
        <button type="button" class="rm" data-rm="${id}" aria-label="Remove ${b.title}">✕</button>`;
      list.appendChild(li);
    });
    const empty = n === 0;
    $('#basket-empty').hidden = !empty;
    $('#basket-filled').hidden = empty;
    $('#t-sub').textContent = gbp(subtotal());
    const phys = physical() > 0;
    $('#t-post').textContent = !phys ? 'By email' : postage() ? gbp(postage()) : 'Free';
    $('#t-total').textContent = $('#t-total-2').textContent = gbp(subtotal() + postage());
    const d = SHOP.delivery.post;
    $('#post-price').textContent = `${gbp(d.first)}${d.extra ? `, +${gbp(d.extra)} each extra paperback` : ''}`;
    $('.delivery').hidden = !phys;
    $('#pdf-note').hidden = !digital();
    const pdfs = items().filter(([id]) => SHOP.books[id].digital).length, eb = pdfs > 1 ? 'eBooks' : 'eBook';
    $('#pdf-note').textContent = phys ? `Your PDF ${eb} will be emailed to you once payment has cleared.` : `Your PDF ${eb} will be emailed to you once payment has cleared, so there's nothing to post.`;
    const post = needsAddress();
    $('#address').hidden = !post;
    $$('#address [data-req]').forEach(i => i.required = post);
  }

  $('#basket-lines').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rm) delete basket[b.dataset.rm];
    if (b.dataset.d) {
      const v = (basket[b.dataset.id] || 0) + (+b.dataset.d);
      if (v <= 0) delete basket[b.dataset.id]; else basket[b.dataset.id] = Math.min(maxFor(b.dataset.id), v);
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
    const r = ref(), phys = physical() > 0, pdf = digital(), post = needsAddress();
    const lines = items().map(([id, q]) => `${q} × ${name(id)} @ ${gbp(SHOP.books[id].price)} = ${gbp(SHOP.books[id].price * q)}`);
    const address = !phys ? '— (PDF only, nothing to post)' : post ? [f.addr1.value, f.addr2.value, f.town.value, f.postcode.value.toUpperCase()].filter(Boolean).join(', ') : 'Collecting in Matlock';
    const deliveryLabel = [phys && SHOP.delivery[method()].label, pdf && 'PDF by email'].filter(Boolean).join(' + ');
    const summary = [...lines, phys ? `Delivery (${SHOP.delivery[method()].label}): ${postage() ? gbp(postage()) : 'Free'}` : 'Delivery: PDF by email (no postage)', `TOTAL: ${gbp(subtotal() + postage())}`].join('\n');
    const next = [
      phys && (post ? 'Your books will be posted as soon as payment has cleared.' : "Anthony will let you know when your books are ready to collect in Matlock."),
      pdf && `Your PDF eBook${items().filter(([id]) => SHOP.books[id].digital).length > 1 ? 's' : ''} will be emailed to you as soon as payment has cleared.`,
    ].filter(Boolean).join(' ');
    const payload = {
      _subject: `New book order ${r}: ${gbp(subtotal() + postage())}`,
      _template: 'table',
      _captcha: 'false',
      _autoresponse: `Thank you for your order (${r}) from Anthony's Little Harbour Series!\n\n${summary}\n\nAnthony will email you shortly with bank details for payment by bank transfer (BACS). Please use ${r} as the payment reference. ${next}`,
      'Order reference': r,
      Name: f.name.value,
      email: f.email.value,
      Phone: f.phone.value || '—',
      Order: summary,
      Delivery: deliveryLabel,
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
      $('#done-next').textContent = next;
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
    const wants = Object.keys(SHOP.books).filter(id => !SHOP.books[id].digital && f['q_' + id]).map(id => `${SHOP.books[id].title}: ${f['q_' + id].value || 0}`).join('\n');
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
