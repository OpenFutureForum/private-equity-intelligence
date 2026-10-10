const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav?.classList.toggle('open', !open);
});

const controls = document.querySelector('[data-controls]');
if (controls) {
  const input = controls.querySelector('[data-filter-input]');
  const buttons = [...controls.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.filter-card')];
  const counter = controls.querySelector('[data-result-count]');
  const empty = document.querySelector('.empty-state');
  let category = 'all';

  const apply = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach((card) => {
      const searchMatch = !query || (card.dataset.search || card.textContent.toLowerCase()).includes(query);
      const categoryMatch = category === 'all' || (card.dataset.category || '').split(' ').includes(category);
      const visible = searchMatch && categoryMatch;
      card.hidden = !visible;
      if (visible) shown += 1;
    });
    if (counter) counter.textContent = `${shown} result${shown === 1 ? '' : 's'}`;
    if (empty) empty.hidden = shown !== 0;
  };

  input.addEventListener('input', apply);
  buttons.forEach((button) => button.addEventListener('click', () => {
    category = button.dataset.filter;
    buttons.forEach((item) => item.classList.toggle('active', item === button));
    apply();
  }));
  apply();
}
