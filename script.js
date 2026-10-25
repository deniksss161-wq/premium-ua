const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menuToggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.textContent = open ? '×' : '☰';
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  if (menuToggle) menuToggle.textContent = '☰';
}));
const search = document.querySelector('#rosterSearch');
const cards = [...document.querySelectorAll('#rosterGrid .player-card')];
const count = document.querySelector('#rosterCount');
function filterRoster() {
  const query = (search?.value || '').trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const match = (card.dataset.name + ' ' + card.innerText).toLowerCase().includes(query);
    card.hidden = !match;
    if (match) visible++;
  });
  if (count) count.textContent = `${visible} ${visible === 1 ? 'учасник' : 'учасники'}`;
}
search?.addEventListener('input', filterRoster);
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();


// Community reviews are stored in Supabase so they can be seen by all visitors.
const reviewForm = document.querySelector('#reviewForm');
const reviewGrid = document.querySelector('#reviewsGrid');
const reviewCount = document.querySelector('#reviewCount');
const reviewStatus = document.querySelector('#reviewStatus');
const reviewSubmit = document.querySelector('#reviewSubmit');
const db = window.PREMIUM_UA_SUPABASE || {};
const dbReady = Boolean(db.url && db.anonKey && !db.url.includes('YOUR_') && !db.anonKey.includes('YOUR_'));
function safeText(value) {
  const span = document.createElement('span');
  span.textContent = value ?? '';
  return span.innerHTML;
}
function reviewCard(review) {
  const article = document.createElement('article');
  article.className = 'review-card';
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
  article.innerHTML = `<div class="review-stars" aria-label="Оцінка ${rating} з 5">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div><p>«${safeText(review.message)}»</p><div class="review-author"><div class="avatar">PU</div><div><b>${safeText(review.name)}</b><small>${safeText(review.role || 'Учасник гільдії')}</small></div></div>`;
  return article;
}
async function loadReviews() {
  if (!reviewGrid || !dbReady) {
    if (reviewGrid) reviewGrid.innerHTML = '<p class="reviews-empty">Форма готова, але для спільного збереження відгуків потрібно налаштувати Supabase. Інструкція є у файлі README.md.</p>';
    if (reviewCount) reviewCount.textContent = 'Потрібне налаштування';
    if (reviewStatus) reviewStatus.textContent = 'Після підключення бази даних відгуки будуть зберігатися та відображатися для всіх відвідувачів.';
    return;
  }
  try {
    const response = await fetch(`${db.url}/rest/v1/reviews?select=id,name,role,rating,message,created_at&order=created_at.desc&limit=50`, {headers:{apikey:db.anonKey, Authorization:`Bearer ${db.anonKey}`} });
    if (!response.ok) throw new Error('Не вдалося отримати відгуки');
    const reviews = await response.json();
    reviewGrid.replaceChildren();
    if (!reviews.length) reviewGrid.innerHTML = '<p class="reviews-empty">Поки що відгуків немає. Будь першим!</p>';
    reviews.forEach(r => reviewGrid.appendChild(reviewCard(r)));
    if (reviewCount) reviewCount.textContent = `${reviews.length} відгуків`;
  } catch (error) {
    reviewGrid.innerHTML = '<p class="reviews-empty">Не вдалося завантажити відгуки. Перевірте налаштування бази даних.</p>';
    if (reviewCount) reviewCount.textContent = 'Помилка завантаження';
  }
}
reviewForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!dbReady) {
    if (reviewStatus) reviewStatus.textContent = 'Відгук поки не надіслано: спочатку потрібно підключити Supabase за інструкцією в README.md.';
    return;
  }
  const formData = new FormData(reviewForm);
  const payload = {name:String(formData.get('name')||'').trim(), role:String(formData.get('role')||'Учасник гільдії'), rating:Number(formData.get('rating')||5), message:String(formData.get('message')||'').trim()};
  if (!payload.name || !payload.message) return;
  reviewSubmit.disabled = true;
  reviewSubmit.textContent = 'Надсилання…';
  if (reviewStatus) reviewStatus.textContent = 'Надсилаємо відгук…';
  try {
    const response = await fetch(`${db.url}/rest/v1/reviews`, {method:'POST', headers:{apikey:db.anonKey, Authorization:`Bearer ${db.anonKey}`, 'Content-Type':'application/json', Prefer:'return=representation'}, body:JSON.stringify(payload)});
    if (!response.ok) throw new Error('Не вдалося надіслати відгук');
    reviewForm.reset();
    if (reviewStatus) reviewStatus.textContent = 'Дякуємо! Твій відгук опубліковано.';
    await loadReviews();
  } catch (error) {
    if (reviewStatus) reviewStatus.textContent = 'Не вдалося опублікувати відгук. Перевірте налаштування Supabase та спробуйте ще раз.';
  } finally {
    reviewSubmit.disabled = false;
    reviewSubmit.textContent = 'Опублікувати відгук ↗';
  }
});
loadReviews();
