export type HtmlShellInput = {
  title: string
  description?: string
  body: string
  css: string
  theme: string
  chartJsScript?: string
}

const clientScript = `
(function () {
  var root = document.documentElement;
  var storageKey = 'simple-mdx-canvas-color-mode';
  var chartInstances = [];
  var storedMode = null;

  try {
    storedMode = localStorage.getItem(storageKey);
  } catch (_) {}

  if (storedMode !== 'light' && storedMode !== 'dark') {
    storedMode = 'light';
  }

  setMode(storedMode);

  function currentMode() {
    return root.getAttribute('data-theme') || 'light';
  }

  function setMode(mode) {
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-color-mode', mode);
  }

  function updateToggle(button) {
    var next = currentMode() === 'dark' ? 'Light' : 'Dark';
    button.textContent = next;
    button.setAttribute('aria-label', 'Switch to ' + next + ' mode');
  }

  function cssVar(name, fallback) {
    var value = getComputedStyle(root).getPropertyValue(name).trim();
    return value || fallback;
  }

  function chartColors() {
    return {
      text: cssVar('--bulma-text', '#1f2937'),
      border: cssVar('--bulma-border', '#d1d5db'),
      primary: cssVar('--bulma-primary', '#485fc7'),
      info: cssVar('--bulma-info', '#3e8ed0'),
      success: cssVar('--bulma-success', '#48c78e'),
      warning: cssVar('--bulma-warning', '#ffe08a'),
      danger: cssVar('--bulma-danger', '#f14668'),
      link: cssVar('--bulma-link', '#485fc7')
    };
  }

  function applyChartTheme(spec) {
    var colors = chartColors();
    spec.options = spec.options || {};
    if (spec.options.responsive == null) spec.options.responsive = true;
    if (spec.options.maintainAspectRatio == null) spec.options.maintainAspectRatio = false;
    if (spec.options.color == null) spec.options.color = colors.text;
    if (spec.options.borderColor == null) spec.options.borderColor = colors.border;

    spec.options.plugins = spec.options.plugins || {};
    spec.options.plugins.legend = spec.options.plugins.legend || {};
    spec.options.plugins.legend.labels = spec.options.plugins.legend.labels || {};
    if (spec.options.plugins.legend.labels.color == null) {
      spec.options.plugins.legend.labels.color = colors.text;
    }

    if (spec.options.scales) {
      Object.keys(spec.options.scales).forEach(function (key) {
        var scale = spec.options.scales[key] || {};
        scale.ticks = scale.ticks || {};
        scale.grid = scale.grid || {};
        if (scale.ticks.color == null) scale.ticks.color = colors.text;
        if (scale.grid.color == null) scale.grid.color = colors.border;
        spec.options.scales[key] = scale;
      });
    }

    return spec;
  }

  function renderCharts() {
    if (!window.Chart) return;
    chartInstances.forEach(function (chart) { chart.destroy(); });
    chartInstances = [];

    document.querySelectorAll('canvas[data-canvas-chart]').forEach(function (canvas) {
      var raw = canvas.getAttribute('data-canvas-chart');
      if (!raw) return;
      try {
        var spec = applyChartTheme(JSON.parse(raw));
        chartInstances.push(new window.Chart(canvas, spec));
      } catch (err) {
        console.error('Failed to render chart', err);
      }
    });
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    updateToggle(button);
    button.addEventListener('click', function () {
      var next = currentMode() === 'dark' ? 'light' : 'dark';
      setMode(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch (_) {}
      updateToggle(button);
      renderCharts();
    });
  });

  document.querySelectorAll('[data-copy-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      var selector = button.getAttribute('data-copy-target');
      var content = selector ? document.querySelector(selector) : null;
      var text = content ? content.innerText : '';
      if (!navigator.clipboard || !text) return;

      navigator.clipboard.writeText(text).then(function () {
        var old = button.textContent;
        button.textContent = 'Copied';
        setTimeout(function () { button.textContent = old; }, 1200);
      });
    });
  });

  document.querySelectorAll('[data-canvas-tabs]').forEach(function (root) {
    var navItems = root.querySelectorAll('[data-canvas-tab-nav]');
    var panels = root.querySelectorAll('[data-canvas-tab-panel]');
    navItems.forEach(function (nav) {
      nav.addEventListener('click', function () {
        var index = nav.getAttribute('data-canvas-tab-nav');
        navItems.forEach(function (item) { item.classList.remove('is-active'); });
        panels.forEach(function (panel) { panel.classList.add('is-hidden'); });
        nav.classList.add('is-active');
        var panel = root.querySelector('[data-canvas-tab-panel="' + index + '"]');
        if (panel) panel.classList.remove('is-hidden');
      });
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCharts);
  } else {
    renderCharts();
  }
})();
`

export function buildHtmlShell(input: HtmlShellInput): string {
  const shouldIncludeChartJs = Boolean(input.chartJsScript && input.body.includes('data-canvas-chart'))
  return `<!doctype html>
<html lang="en" data-theme="light" data-canvas-theme="${escapeHtml(input.theme)}" data-color-mode="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  ${input.description ? `<meta name="description" content="${escapeHtml(input.description)}" />` : ''}
  <style>${input.css}</style>
</head>
<body>
  <div class="canvas-shell">
    <header class="canvas-toolbar">
      <div class="canvas-toolbar-inner">
        <span class="is-size-7 has-text-weight-semibold">${escapeHtml(input.title)}</span>
        <button class="button is-small" type="button" data-theme-toggle>Dark</button>
      </div>
    </header>
    <main class="canvas-page content">
      ${input.body}
    </main>
  </div>
  ${shouldIncludeChartJs ? `<script>${input.chartJsScript}</script>` : ''}
  <script>${clientScript}</script>
</body>
</html>
`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
