$(document).ready(function() {
  const MAX_ORDER = 8;
  const MAX_DATA_POINTS = 2000;
  const MAX_ENCODED_PLOT_LENGTH = 50000;
  const PLOT_SAMPLE_COUNT = 1000;
  const SLIDER_UNITS = 1000;

  let csvPoints = [];
  let isDarkMode = true;
  let plotFrame = null;
  let saveAfterPlot = false;
  let panelVisible = true;
  let sidebarVisible = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function parseFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeOrder(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? clamp(parsed, 1, MAX_ORDER) : 1;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function setStatus(message, type = 'warning') {
    const status = $('#status-output');
    status.removeClass('success error warning');
    if (!message) {
      status.prop('hidden', true).text('');
      return;
    }
    status.addClass(type).text(message).prop('hidden', false);
  }

  function encodeLZ(data) {
    return LZString.compressToBase64(JSON.stringify(data));
  }

  function decodeLZ(data) {
    const json = LZString.decompressFromBase64(data);
    if (typeof json !== 'string') throw new Error('The compressed plot data is invalid.');
    return JSON.parse(json);
  }

  function decodeLegacyBase64(data) {
    return JSON.parse(atob(data));
  }

  function validatePointArray(points) {
    if (!Array.isArray(points)) throw new Error('Plot data must be an array.');
    if (points.length > MAX_DATA_POINTS) {
      throw new Error(`Plot data is limited to ${MAX_DATA_POINTS} points.`);
    }
    return points.map((point, index) => {
      if (!point || typeof point !== 'object') {
        throw new Error(`Plot point ${index + 1} is invalid.`);
      }
      const x = parseFiniteNumber(point.x);
      const y = parseFiniteNumber(point.y);
      if (x === null || y === null) {
        throw new Error(`Plot point ${index + 1} must contain finite X and Y values.`);
      }
      return { x, y };
    });
  }

  function parseCsvInput(text) {
    const lines = String(text).split(/\r?\n/);
    const points = [];
    const errors = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const fields = trimmed.split(/[,\s]+/);
      if (fields.length !== 2) {
        errors.push(`Line ${index + 1}: expected exactly two values.`);
        return;
      }
      const x = parseFiniteNumber(fields[0]);
      const y = parseFiniteNumber(fields[1]);
      if (x === null || y === null) {
        errors.push(`Line ${index + 1}: X and Y must be finite numbers.`);
        return;
      }
      points.push({ x, y });
    });

    if (points.length > MAX_DATA_POINTS) {
      errors.push(`A maximum of ${MAX_DATA_POINTS} points can be plotted.`);
    }
    if (points.length === 0 && errors.length === 0) {
      errors.push('Enter at least one X Y point.');
    }
    if (errors.length > 0) {
      return { points: [], error: errors.slice(0, 3).join(' ') };
    }
    return { points, error: null };
  }

  function readAxisRanges(showError = true) {
    const minX = parseFiniteNumber($('#min-x').val());
    const maxX = parseFiniteNumber($('#max-x').val());
    const minY = parseFiniteNumber($('#min-y').val());
    const maxY = parseFiniteNumber($('#max-y').val());

    if ([minX, maxX, minY, maxY].some(value => value === null)) {
      if (showError) setStatus('Axis limits must be finite numbers.', 'error');
      return null;
    }
    if (minX >= maxX || minY >= maxY) {
      if (showError) setStatus('Each minimum axis value must be less than its maximum.', 'error');
      return null;
    }
    return { minX, maxX, minY, maxY };
  }

  function getParameters(order) {
    const parameters = [];
    for (let index = 0; index <= order; index++) {
      const value = parseFiniteNumber($(`#${String.fromCharCode(97 + index)}`).val());
      parameters.push(value === null ? 0 : value);
    }
    return parameters;
  }

  function evaluatePolynomial(parameters, order, x) {
    let y = parameters[order];
    for (let index = order - 1; index >= 0; index--) {
      y = y * x + parameters[index];
    }
    return Number.isFinite(y) ? y : null;
  }

  function updatePlot() {
    const axes = readAxisRanges(true);
    if (!axes) return false;

    const order = normalizeOrder($('#order').val());
    $('#order, #poly-order').val(order);
    const parameters = getParameters(order);
    const graphTitle = String($('#graph-title').val()).slice(0, 200);
    const themeStyles = window.getComputedStyle(document.body);
    const themeColor = name => themeStyles.getPropertyValue(name).trim();
    const colors = {
      background: themeColor('--app-bg'),
      text: themeColor('--text'),
      textSoft: themeColor('--text-soft'),
      grid: themeColor('--plot-grid'),
      line: themeColor('--plot-line'),
      point: themeColor('--plot-point'),
      surface: themeColor('--surface-solid')
    };
    const x = [];
    const y = [];
    let overflowed = false;

    for (let index = 0; index <= PLOT_SAMPLE_COUNT; index++) {
      const xValue = axes.minX + ((axes.maxX - axes.minX) * index / PLOT_SAMPLE_COUNT);
      const yValue = evaluatePolynomial(parameters, order, xValue);
      x.push(xValue);
      y.push(yValue);
      if (yValue === null) overflowed = true;
    }

    const traces = [{
      x,
      y,
      type: 'scatter',
      mode: 'lines',
      name: 'Polynomial',
      line: { color: colors.line, width: 3 }
    }];

    if (csvPoints.length > 0) {
      traces.push({
        x: csvPoints.map(point => point.x),
        y: csvPoints.map(point => point.y),
        mode: 'markers',
        type: 'scatter',
        name: 'Data',
        marker: {
          color: colors.point,
          size: 8,
          line: { color: colors.background, width: 1.5 }
        }
      });
    }

    if (typeof Plotly === 'undefined') {
      setStatus('Plotly failed to load. Check the network connection and reload.', 'error');
      return false;
    }

    Plotly.react('plot', traces, {
      title: { text: escapeHtml(graphTitle) },
      xaxis: {
        range: [axes.minX, axes.maxX],
        gridcolor: colors.grid,
        zerolinecolor: colors.grid,
        linecolor: colors.grid,
        tickfont: { color: colors.textSoft }
      },
      yaxis: {
        range: [axes.minY, axes.maxY],
        gridcolor: colors.grid,
        zerolinecolor: colors.grid,
        linecolor: colors.grid,
        tickfont: { color: colors.textSoft }
      },
      paper_bgcolor: colors.background,
      plot_bgcolor: colors.background,
      font: {
        color: colors.text,
        family: 'Inter, Segoe UI, sans-serif'
      },
      hoverlabel: {
        bgcolor: colors.surface,
        bordercolor: colors.grid,
        font: { color: colors.text }
      },
      margin: { t: 76, r: 42, b: 58, l: 66 },
      hovermode: 'closest',
      uirevision: 'polynomial-visualizer'
    }, {
      responsive: true,
      displaylogo: false
    });

    updateFormulaOutput(parameters, order);
    if (overflowed) {
      setStatus('Some polynomial values exceeded the browser numeric range and were omitted.', 'error');
    }
    return true;
  }

  function schedulePlotUpdate(saveUrl = true) {
    saveAfterPlot = saveAfterPlot || saveUrl;
    if (plotFrame !== null) return;
    plotFrame = window.requestAnimationFrame(() => {
      plotFrame = null;
      const shouldSave = saveAfterPlot;
      saveAfterPlot = false;
      if (updatePlot() && shouldSave) saveParametersToURL();
    });
  }

  function sliderSpanFor(index, anchor) {
    const axes = readAxisRanges(false) || { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    const xScale = Math.max(Math.abs(axes.minX), Math.abs(axes.maxX), 1);
    const yScale = Math.max(Math.abs(axes.maxY - axes.minY), 1);
    const domainScale = Math.pow(xScale, index);
    const impactBasedSpan = Number.isFinite(domainScale) && domainScale > 0
      ? (yScale * 0.5) / domainScale
      : 0;
    const relativeSpan = Math.abs(anchor) * 0.5;
    const floatingPointFloor = Number.EPSILON * Math.max(Math.abs(anchor), 1) * 32;
    return Math.max(impactBasedSpan, relativeSpan, floatingPointFloor);
  }

  function coefficientAtSliderPosition(anchor, span, position) {
    const normalized = clamp(position / SLIDER_UNITS, -1, 1);
    return anchor + Math.sign(normalized) * span * Math.pow(Math.abs(normalized), 2);
  }

  function formatInputNumber(value) {
    if (Object.is(value, -0)) return '0';
    return Number(value.toPrecision(15)).toString();
  }

  function describeSlider(index) {
    const letter = String.fromCharCode(65 + index);
    const slider = $(`#slider-${letter.toLowerCase()}`);
    const anchor = slider.data('anchor');
    const span = slider.data('span');
    const description = `${letter} anchor ${formatInputNumber(anchor)}; full range ±${formatInputNumber(span)}. Fine control increases near center.`;
    slider.attr('title', description);
    slider.find('.ui-slider-handle')
      .attr('aria-label', `${letter} coefficient fine adjustment`)
      .attr('aria-valuetext', `Anchor ${formatInputNumber(anchor)}`);
  }

  function applySliderPosition(index, position) {
    const letter = String.fromCharCode(97 + index);
    const slider = $(`#slider-${letter}`);
    const anchor = slider.data('anchor');
    const span = slider.data('span');
    const coefficient = coefficientAtSliderPosition(anchor, span, position);
    $(`#${letter}`).val(formatInputNumber(coefficient));
    slider.find('.ui-slider-handle').attr('aria-valuetext', formatInputNumber(coefficient));
    schedulePlotUpdate(true);
  }

  function setSliderAnchor(index, anchor) {
    const letter = String.fromCharCode(97 + index);
    const slider = $(`#slider-${letter}`);
    if (!slider.hasClass('ui-slider')) return;
    slider.data('anchor', anchor);
    slider.data('span', sliderSpanFor(index, anchor));
    slider.slider('value', 0);
    describeSlider(index);
  }

  function initializeSlider(index) {
    const letter = String.fromCharCode(97 + index);
    const slider = $(`#slider-${letter}`);
    const input = $(`#${letter}`);
    const anchor = parseFiniteNumber(input.val()) ?? 0;

    if (slider.hasClass('ui-slider')) slider.slider('destroy');
    slider.off('.coefficientSlider');
    slider.data('anchor', anchor);
    slider.data('span', sliderSpanFor(index, anchor));
    slider.slider({
      min: -SLIDER_UNITS,
      max: SLIDER_UNITS,
      step: 1,
      value: 0,
      slide: (event, ui) => applySliderPosition(index, ui.value)
    });
    slider.on('dblclick.coefficientSlider', () => {
      slider.slider('value', 0);
      applySliderPosition(index, 0);
    });
    describeSlider(index);
  }

  function initializeSliders() {
    for (let index = 0; index <= MAX_ORDER; index++) initializeSlider(index);
  }

  function refreshSliderSensitivity() {
    for (let index = 0; index <= MAX_ORDER; index++) {
      const letter = String.fromCharCode(97 + index);
      const slider = $(`#slider-${letter}`);
      if (!slider.hasClass('ui-slider')) continue;
      const anchor = slider.data('anchor');
      slider.data('span', sliderSpanFor(index, anchor));
      describeSlider(index);
    }
  }

  function updateParameterVisibility() {
    const order = normalizeOrder($('#order').val());
    $('#order, #poly-order').val(order);
    for (let index = 0; index <= MAX_ORDER; index++) {
      const letter = String.fromCharCode(97 + index);
      $(`#${letter}`).closest('.input-group').toggle(index <= order);
    }
  }

  function initializeParameters() {
    const parameterGroup = $('#parameter-group');
    parameterGroup.empty();
    for (let index = 0; index <= MAX_ORDER; index++) {
      const letter = String.fromCharCode(97 + index);
      const upperLetter = letter.toUpperCase();
      parameterGroup.append(`
        <div class="input-group">
          <label for="${letter}">${upperLetter}:</label>
          <input type="number" id="${letter}" value="0" step="any" inputmode="decimal">
          <div id="slider-${letter}" class="slider"></div>
          <button type="button" class="slider-center-button" data-index="${index}" aria-label="Restore ${upperLetter} to its slider anchor" title="Restore anchor"><i class="fa-solid fa-crosshairs" aria-hidden="true"></i><span class="visually-hidden">Center</span></button>
        </div>
      `);
    }
    const loadWarning = loadParametersFromURL();
    updateParameterVisibility();
    initializeSliders();
    updatePlot();
    if (loadWarning) setStatus(loadWarning, 'error');
  }

  function calculatePlot(points) {
    const order = normalizeOrder($('#poly-order').val());
    $('#order, #poly-order').val(order);
    if (points.length < order + 1) {
      setStatus(`An order ${order} fit requires at least ${order + 1} points.`, 'error');
      return false;
    }
    const distinctXValues = new Set(points.map(point => point.x));
    if (distinctXValues.size < order + 1) {
      setStatus(`An order ${order} fit requires at least ${order + 1} distinct X values.`, 'error');
      return false;
    }

    try {
      const x = points.map(point => point.x);
      const y = points.map(point => point.y);
      const coefficients = Array.from(new Polyfit(x, y).computeCoefficients(order));
      if (coefficients.some(coefficient => !Number.isFinite(coefficient))) {
        throw new Error('The regression produced a non-finite coefficient.');
      }
      coefficients.forEach((coefficient, index) => {
        $(`#${String.fromCharCode(97 + index)}`).val(formatInputNumber(coefficient));
      });
      updateParameterVisibility();
      initializeSliders();
      schedulePlotUpdate(true);
      setStatus(`Generated an order ${order} fit from ${points.length} points.`, 'success');
      return true;
    }
    catch (error) {
      setStatus(`Unable to fit the polynomial: ${error.message}`, 'error');
      return false;
    }
  }

  function updateFormulaOutput(parameters, order) {
    let htmlFormula = 'y = ';
    let textFormula = 'y = ';

    for (let index = 0; index <= order; index++) {
      const coefficient = parameters[index];
      const absolute = Math.abs(coefficient);
      const display = formatInputNumber(index === 0 ? coefficient : absolute);
      let variableHtml = '';
      let variableText = '';
      if (index === 1) {
        variableHtml = 'x';
        variableText = 'x';
      }
      else if (index > 1) {
        variableHtml = `x<sup>${index}</sup>`;
        variableText = `x^${index}`;
      }

      if (index === 0) {
        htmlFormula += display;
        textFormula += display;
      }
      else {
        const sign = coefficient < 0 ? ' - ' : ' + ';
        htmlFormula += `${sign}${display}${variableHtml}`;
        textFormula += `${sign}${display}${variableText}`;
      }
    }

    $('#formula-output')
      .html(`<div class="formula"><span tabindex="0" role="button" aria-label="Copy formula"><i class="fa-regular fa-copy" aria-hidden="true"></i>${htmlFormula}</span></div>`)
      .data('text', textFormula);
  }

  async function copyFormulaToClipboard() {
    const formulaOutput = $('#formula-output');
    const originalHtml = formulaOutput.html();
    const formulaText = formulaOutput.data('text');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formulaText);
      }
      else {
        const tempInput = $('<input>').val(formulaText).appendTo('body').select();
        document.execCommand('copy');
        tempInput.remove();
      }
      formulaOutput.html("<div class='formula'><span><i class='fa-solid fa-check' aria-hidden='true'></i>Formula copied</span></div>");
      window.setTimeout(() => formulaOutput.html(originalHtml), 2000);
    }
    catch (error) {
      setStatus('The formula could not be copied. Select it manually instead.', 'error');
    }
  }

  function saveParametersToURL() {
    const axes = readAxisRanges(false);
    if (!axes) return;
    const params = new URLSearchParams();
    const order = normalizeOrder($('#order').val());
    for (let index = 0; index <= order; index++) {
      const letter = String.fromCharCode(97 + index);
      params.set(letter, $(`#${letter}`).val());
    }
    params.set('min-x', axes.minX);
    params.set('max-x', axes.maxX);
    params.set('min-y', axes.minY);
    params.set('max-y', axes.maxY);
    params.set('order', order);
    params.set('graph-title', String($('#graph-title').val()).slice(0, 200));

    if (csvPoints.length > 0) {
      const encodedPlot = encodeLZ(csvPoints);
      if (encodedPlot.length <= MAX_ENCODED_PLOT_LENGTH) {
        params.set('plot', encodedPlot);
      }
      else {
        setStatus('The plotted data is too large to include in a shareable URL; the curve settings were still saved.', 'error');
      }
    }
    window.history.replaceState({}, '', `${location.pathname}?${params.toString()}${location.hash}`);
  }

  function loadParametersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const warnings = [];
    if (params.has('order')) {
      const requestedOrder = Number.parseInt(params.get('order'), 10);
      const order = normalizeOrder(requestedOrder);
      if (requestedOrder !== order) warnings.push(`Polynomial order was limited to ${order}.`);
      $('#order, #poly-order').val(order);
    }
    if (params.has('graph-title')) {
      $('#graph-title').val(params.get('graph-title').slice(0, 200));
      setPanelVisible(false);
    }

    const order = normalizeOrder($('#order').val());
    for (let index = 0; index <= order; index++) {
      const letter = String.fromCharCode(97 + index);
      if (!params.has(letter)) continue;
      const value = parseFiniteNumber(params.get(letter));
      if (value === null) warnings.push(`Coefficient ${letter.toUpperCase()} was invalid and reset to zero.`);
      $(`#${letter}`).val(value === null ? 0 : value);
    }

    const axisDefaults = { 'min-x': 0, 'max-x': 100, 'min-y': 0, 'max-y': 100 };
    Object.entries(axisDefaults).forEach(([id, defaultValue]) => {
      if (!params.has(id)) return;
      const value = parseFiniteNumber(params.get(id));
      if (value === null) warnings.push(`${id} was invalid and reset.`);
      $(`#${id}`).val(value === null ? defaultValue : value);
    });
    if (!readAxisRanges(false)) {
      $('#min-x, #min-y').val(0);
      $('#max-x, #max-y').val(100);
      warnings.push('Invalid axis ranges were reset to 0–100.');
    }

    const encodedPoints = params.has('plot') ? params.get('plot') : params.get('csvPoints');
    if (encodedPoints !== null) {
      try {
        if (encodedPoints.length > MAX_ENCODED_PLOT_LENGTH) {
          throw new Error('Encoded plot data is too large.');
        }
        const decoded = params.has('plot') ? decodeLZ(encodedPoints) : decodeLegacyBase64(encodedPoints);
        csvPoints = validatePointArray(decoded);
        $('#csv-input').val(csvPoints.map(point => `${point.x},${point.y}`).join('\n'));
      }
      catch (error) {
        csvPoints = [];
        warnings.push(`Shared plot data was ignored: ${error.message}`);
      }
    }
    return warnings.join(' ');
  }

  function readPointsFromTextarea() {
    const parsed = parseCsvInput($('#csv-input').val());
    if (parsed.error) {
      setStatus(parsed.error, 'error');
      return null;
    }
    csvPoints = parsed.points;
    return parsed.points;
  }

  function setPanelVisible(visible) {
    panelVisible = visible;
    $('#panel').toggle(visible);
    $('#panel-toggle')
      .toggleClass('open', !visible)
      .toggleClass('close', visible)
      .html(`<i class="fa-solid ${visible ? 'fa-chevron-up' : 'fa-sliders'}" aria-hidden="true"></i>`)
      .attr('aria-expanded', visible)
      .attr('aria-label', visible ? 'Hide controls' : 'Show controls')
      .attr('title', visible ? 'Hide controls' : 'Show controls');
  }

  function setSidebarVisible(visible) {
    sidebarVisible = visible;
    $('#sidebar').toggleClass('open', visible);
    $('#sidebar-toggle')
      .toggleClass('open', !visible)
      .toggleClass('close', visible)
      .html(`<i class="fa-solid ${visible ? 'fa-xmark' : 'fa-table-list'}" aria-hidden="true"></i>`)
      .attr('aria-expanded', visible)
      .attr('aria-label', visible ? 'Close data sidebar' : 'Open data sidebar')
      .attr('title', visible ? 'Close data sidebar' : 'Plot data');
  }

  $('#formula-output').on('click', '.formula span', copyFormulaToClipboard);
  $('#formula-output').on('keydown', '.formula span', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      copyFormulaToClipboard();
    }
  });

  $('#graph-title').on('input', () => schedulePlotUpdate(true));

  $('#theme-toggle').on('click', function() {
    isDarkMode = !isDarkMode;
    $('body').toggleClass('dark', isDarkMode);
    $(this).html(`<i class="fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i><span>${isDarkMode ? 'Light mode' : 'Dark mode'}</span>`);
    schedulePlotUpdate(false);
  });

  $('#reset-button').on('click', function() {
    window.location.replace(window.location.href.split('?')[0]);
  });

  $('#parameter-group').on('input', "input[type='number']", function() {
    if (parseFiniteNumber($(this).val()) !== null) schedulePlotUpdate(true);
  });

  $('#parameter-group').on('change', "input[type='number']", function() {
    const value = parseFiniteNumber($(this).val());
    if (value === null) {
      setStatus('Coefficients must be finite numbers.', 'error');
      return;
    }
    setSliderAnchor($(this).attr('id').charCodeAt(0) - 97, value);
    schedulePlotUpdate(true);
  });

  $('#parameter-group').on('click', '.slider-center-button', function() {
    const index = Number($(this).data('index'));
    const letter = String.fromCharCode(97 + index);
    const slider = $(`#slider-${letter}`);
    slider.slider('value', 0);
    applySliderPosition(index, 0);
  });

  $('#min-x, #max-x, #min-y, #max-y').on('change', function() {
    if (!readAxisRanges(true)) return;
    refreshSliderSensitivity();
    schedulePlotUpdate(true);
  });

  $('#order, #poly-order').on('change', function() {
    const order = normalizeOrder($(this).val());
    $('#order, #poly-order').val(order);
    updateParameterVisibility();
    if (csvPoints.length > 0) calculatePlot(csvPoints);
    else schedulePlotUpdate(true);
  });

  $(window).on('resize', () => {
    if (typeof Plotly !== 'undefined') Plotly.Plots.resize(document.getElementById('plot'));
  });

  $('#panel-toggle').on('click', () => setPanelVisible(!panelVisible));
  $('#sidebar-toggle').on('click', () => setSidebarVisible(!sidebarVisible));

  $('#plot-points-button').on('click', function() {
    const points = readPointsFromTextarea();
    if (!points) return;
    schedulePlotUpdate(true);
    setStatus(`Plotted ${points.length} data points.`, 'success');
  });

  $('#float-button').on('click', function() {
    $('#panel').toggleClass('float');
    const isFloating = $('#panel').hasClass('float');
    $(this).html(`<i class="fa-solid ${isFloating ? 'fa-thumbtack' : 'fa-window-maximize'}" aria-hidden="true"></i><span>${isFloating ? 'Dock panel' : 'Float panel'}</span>`);
    $(window).scrollTop($(document).height());
  });

  $('#generate-button').on('click', function() {
    const points = readPointsFromTextarea();
    if (points) calculatePlot(points);
  });

  initializeParameters();
});
