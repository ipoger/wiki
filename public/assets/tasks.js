(() => {
  const boxes = Array.from(
    document.querySelectorAll('.wiki input[type="checkbox"]'),
  );
  if (!boxes.length) return;

  const key = `wiki-tasks:${location.pathname}`;
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    state = {};
  }

  boxes.forEach((box, index) => {
    box.disabled = false;
    if (state[index]) box.checked = true;
    box.addEventListener("change", () => {
      state[index] = box.checked;
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* storage may be unavailable */
      }
    });
  });
})();
