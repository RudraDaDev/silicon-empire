/**
 * The section map. Four live in the sidebar; the rest open from the
 * double-arrow drawer so the rail stays short and scannable.
 *
 * Nothing here builds screens — sections are destinations, and until sim/
 * lands every one of them resolves to a toast.
 */

export const PRIMARY = [
  { id: 'design', icon: 'ruler', label: 'design' },
  { id: 'lab', icon: 'beaker', label: 'lab' },
  { id: 'fab', icon: 'wafer', label: 'fab' },
  { id: 'marketing', icon: 'megaphone', label: 'marketing' },
];

export const MORE = [
  { id: 'market', icon: 'scale', label: 'market' },
  { id: 'browser', icon: 'browser', label: 'browser' },
  { id: 'employee', icon: 'user', label: 'employee' },
  { id: 'contracts', icon: 'contract', label: 'contracts' },
  { id: 'pip', icon: 'clipboard', label: 'pip' },
  { id: 'finance', icon: 'ledger', label: 'finance' },
  { id: 'news', icon: 'news', label: 'news' },
  { id: 'company', icon: 'company', label: 'firm' },
];

/**
 * One button, two dresses: the sidebar's stacked icon + caption, and the
 * drawer's horizontal row. Same element, same dataset, same handler shape.
 */
export function sectionButton(section, { variant = 'nav', iconSize = 24, disabled = false } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${variant}-item`;
  button.dataset.nav = section.id;
  button.title = section.label;
  if (disabled) button.disabled = true;
  button.innerHTML = `<svg class="i i--${iconSize}" aria-hidden="true"><use href="#i-${section.icon}"/></svg>
    <span class="${variant}-item__label">${section.label}</span>`;
  return button;
}

/** A section can be current from either list, so clear both. */
export function markCurrent(id) {
  document.querySelectorAll('[data-nav]').forEach((button) => {
    if (button.dataset.nav === id) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}
