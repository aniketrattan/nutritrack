// Select all tab buttons and content panels
const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.faq-content');

// Activate accordion behavior within a given scope
function activateAccordions(scope) {
  const accordions = scope.querySelectorAll('.accordion');
  accordions.forEach((acc) => {
    acc.onclick = function () {
      this.classList.toggle('active'); // Toggle active class

      const panel = this.nextElementSibling; // Get the next element (the panel)
      if (panel.style.display === 'block') {
        panel.style.display = 'none'; // Collapse panel
      } else {
        panel.style.display = 'block'; // Expand panel
      }
    };
  });
}

// Set up tab switching behavior
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    // Remove 'active' class from all tabs
    tabs.forEach((t) => t.classList.remove('active'));

    // Hide all content panels
    contents.forEach((c) => c.classList.add('hidden'));

    // Activate clicked tab and show corresponding panel
    tab.classList.add('active');
    const targetId = tab.dataset.tab;
    const targetEl = document.getElementById(targetId);
    targetEl.classList.remove('hidden');

    // Enable accordion inside the selected tab content
    activateAccordions(targetEl);
  });
});

// On initial load, activate accordions in the visible content panel
activateAccordions(document.querySelector('.faq-content:not(.hidden)'));
