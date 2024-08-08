$(document).ready(function() {
  const MAX_ORDER = 8;
  let csvPoints = [];
  let isDarkMode = true;

  function encodeBase64(data) {
    return btoa(JSON.stringify(data));
  }

  function decodeBase64(data) {
    return JSON.parse(atob(data));
  }
  
  function encodeLZ(data) {
    const jsonString = JSON.stringify(data);
    const compressedString = LZString.compressToBase64(jsonString);
    return compressedString;
  }

  function decodeLZ(data) {
    const decompressedString = LZString.decompressFromBase64(data);
    const parsedData = JSON.parse(decompressedString);
    return parsedData;
  }

  function PolynomialRegression(x, y, order) {
    const polyfit = new Polyfit(x, y);
    const coefficients = polyfit.computeCoefficients(order);
    return {
      getCoefficients: () => coefficients,
      setIntercept: (intercept) => {
        const modifiedCoefficients = coefficients.slice();
        modifiedCoefficients[modifiedCoefficients.length - 1] = intercept;
        return { getCoefficients: () => modifiedCoefficients, };
      }
    };
  }

  function updatePlot() {
    const params = getParameters();
    const minX = parseFloat($("#min-x").val()) || 0;
    const maxX = parseFloat($("#max-x").val()) || 100;
    const minY = parseFloat($("#min-y").val()) || 0;
    const maxY = parseFloat($("#max-y").val()) || 100;
    const order = parseInt($("#order").val());
    const graphTitle = $("#graph-title").val();

    const x = [];
    const y = [];

    for (let i = minX; i <= maxX; i += 0.1) {
      let yi = 0;
      for (let j = 0; j <= order; j++) { yi += params[j] * Math.pow(i, j); }
      x.push(i);
      y.push(yi);
    }

    const trace = {
      x: x,
      y: y,
      type: 'scatter'
    };

    const layout = {
      title: graphTitle,
      xaxis: { range: [minX, maxX] },
      yaxis: { range: [minY, maxY] },
      paper_bgcolor: isDarkMode ? '#121212' : '#fff',
      plot_bgcolor: isDarkMode ? '#121212' : '#fff',
      font: {
        color: isDarkMode ? '#e0e0e0' : '#000'
      }
    };

    const traces = [trace];

    if (csvPoints.length > 0) {
      const csvTrace = {
        x: csvPoints.map(point => point.x),
        y: csvPoints.map(point => point.y),
        mode: 'markers',
        type: 'scatter'
      };
      traces.push(csvTrace);
    }

    Plotly.newPlot('plot', traces, layout);
    updateFormulaOutput(params, order);
  }

  function calculateStep(value) {
    if (value === 0) return 0.00001;
    let magnitude = Math.floor(Math.log10(Math.abs(value)));
    return Math.pow(10, magnitude - 2);
  }

  function updateSlider(sliderId, currentId) {
    const value = parseFloat($(currentId).val()) || 0;
    const step = calculateStep(value);
    const min = value - Math.abs(value * 0.5);
    const max = value + Math.abs(value * 1.5);

    $(sliderId).slider({
      min: min,
      max: max,
      step: step,
      value: value,
      slide: (event, ui) => {
        $(currentId).val(ui.value);
        updatePlot();
        saveParametersToURL();
      }
    });

    $(currentId).on("input", function() {
      const newValue = parseFloat($(this).val()) || 0;
      $(sliderId).slider("value", newValue);
      $(sliderId).slider("option", "min", newValue - Math.abs(newValue * 0.5));
      $(sliderId).slider("option", "max", newValue + Math.abs(newValue * 1.5));
      $(sliderId).slider("option", "step", calculateStep(newValue));
      updatePlot();
      saveParametersToURL();
    });
  }

  function initializeSliders() {
    const order = parseInt($("#order").val());
    for (let i = 0; i <= MAX_ORDER; i++) {
      const letter = String.fromCharCode(97 + i);
      const slider = $(`#slider-${letter}`);
      if (i <= order) {
        slider.show();
        updateSlider(`#slider-${letter}`, `#${letter}`);
      }
      else { slider.hide(); }
    }
  }

  function initializeParameters() {
    const order = parseInt($("#order").val());
    const parameterGroup = $("#parameter-group");
    parameterGroup.empty();
    for (let i = 0; i <= MAX_ORDER; i++) {
      const letter = String.fromCharCode(97 + i);
      const step = calculateStep(0.00001);
      parameterGroup.append(`
        <div class="input-group" style="${i <= order ? '' : 'display:none;'}">
          <label for="${letter}">${letter.toUpperCase()}:</label>
          <input type="number" id="${letter}" value="0" step="${step}">
          <div id="slider-${letter}" class="slider"></div>
        </div>
      `);
    }
    loadParametersFromURL();
    initializeSliders();
    updatePlot();
    Plotly.Plots.resize(document.getElementById('plot'));
  }

  function getParameters() {
    const params = [];
    const order = parseInt($("#order").val());
    for (let i = 0; i <= MAX_ORDER; i++) {
      const input = $(`#${String.fromCharCode(97 + i)}`);
      params.push(input.length ? parseFloat(input.val()) || 0 : 0);
    }
    return params;
  }

  function updateFormulaOutput(params, order) {
    const formulaObj = $("#formula-output");
    let htmlFormula = "y = ";
    let textFormula = "y = ";

    for (let i = 0; i <= order; i++) {
      const coefficient = parseFloat(params[i]);
      let htmlTerm = `${coefficient}x<sup>${i}</sup>`;
      let textTerm = `${coefficient}x^${i}`;

      if (i === 0) {
        htmlTerm = `${coefficient}`;
        textTerm = `${coefficient}`;
      }
      else if (i === 1) {
        htmlTerm = `${coefficient}x`;
        textTerm = `${coefficient}x`;
      }

      if (i > 0 && params[i] >= 0) {
        htmlTerm = ` + ${htmlTerm}`;
        textTerm = ` + ${textTerm}`;
      }
      else if (i > 0 && params[i] < 0) {
        htmlTerm = ` - ${Math.abs(coefficient)}x<sup>${i}</sup>`;
        textTerm = ` - ${Math.abs(coefficient)}x^${i}`;
      }

      htmlFormula += htmlTerm;
      textFormula += textTerm;
    }

    formulaObj.html(`<div class="formula"><span>${htmlFormula}</span></div>`);
    formulaObj.data('text', textFormula);
  }
  
  function copyFormulaToClipboard() {
    const formulaOutput = $("#formula-output");
    const originalHtml = formulaOutput.html();
    const formulaText = formulaOutput.data('text');

    const tempInput = $("<input>");
    $("body").append(tempInput);
    tempInput.val(formulaText).select();
    document.execCommand("copy");
    tempInput.remove();

    formulaOutput.html("<div class='formula'>Formula copied to clipboard!</div>");

    setTimeout(() => {
      formulaOutput.html(originalHtml);
    }, 2000);
  }

  function resetParameters() {
    $("#min-x, #min-y").val(0);
    $("#max-x, #max-y").val(100);
    $("#order").val(4);
    for (let i = 0; i <= MAX_ORDER; i++) {
      const letter = String.fromCharCode(97 + i);
      $(`#${letter}`).val(0);
    }
    updatePlot();
    initializeParameters();
    initializeSliders();
    saveParametersToURL();
  }

  function saveParametersToURL() {
    const params = new URLSearchParams();
    const order = parseInt($("#order").val());
    for (let i = 0; i <= order; i++) {
      const letter = String.fromCharCode(97 + i);
      params.set(letter, $(`#${letter}`).val());
    }
    params.set('min-x', $("#min-x").val());
    params.set('max-x', $("#max-x").val());
    params.set('min-y', $("#min-y").val());
    params.set('max-y', $("#max-y").val());
    params.set('order', order);
    params.set('graph-title', $("#graph-title").val());
    if (csvPoints.length > 0) {
      params.set('plot', encodeLZ(csvPoints));
    }
    window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
  }

  function loadParametersFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('order')) {
      $("#order").val(params.get('order'));
      $("#poly-order").val(params.get('order'));
    }
    if (params.has('graph-title')) {
      $("#graph-title").val(params.get('graph-title'));
      $("#panel-toggle").toggleClass('open').toggleClass('close');
      $("#panel").hide();
      $("#panel-toggle").find('i').toggleClass('fa-xmark').toggleClass('fa-arrow-down');
    }
    const order = parseInt($("#order").val());
    for (let i = 0; i <= MAX_ORDER; i++) {
      const letter = String.fromCharCode(97 + i);
      const input = $(`#${letter}`);
      if (i <= order) {
        if (params.has(letter)) { input.val(params.get(letter)); }
        else { input.val(0); }
        input.closest('.input-group').show();
      }
      else { input.closest('.input-group').hide(); }
    }
    $("#min-x").val(params.get('min-x') || 0);
    $("#max-x").val(params.get('max-x') || 100);
    $("#min-y").val(params.get('min-y') || 0);
    $("#max-y").val(params.get('max-y') || 100);

    if (params.has('csvPoints')) {
      csvPoints = decodeBase64(params.get('csvPoints'));
      const csvText = csvPoints.map(point => `${point.x},${point.y}`).join('\n');
      $("#csv-input").val(csvText);
    }
    else if (params.has('plot')) {
      csvPoints = decodeLZ(params.get('plot'));
      const csvText = csvPoints.map(point => `${point.x},${point.y}`).join('\n');
      $("#csv-input").val(csvText);
    }
  }
  
  $("#formula-output").on("click", ".formula span", copyFormulaToClipboard);

  $("#graph-title").on('input change', function() {
    updatePlot();
    saveParametersToURL();
  });
  
  $("#theme-toggle").on('click', function() {
    isDarkMode = !isDarkMode;
    $('body').toggleClass('dark');
    $(this).html($('body').hasClass('dark') ? 'Light Mode' : 'Dark Mode');
    updatePlot();
  });
  
  $("form").submit(function(e) {
    e.preventDefault();
  });

  $("#reset-button").on("click", function() {
    const baseUrl = window.location.href.split('?')[0];
    window.location.href = baseUrl;
  });

  $("#parameter-group").on("change keyup", "input[type='number']", function() {
    let id = $(this).attr("id");
    $("#" + id).attr("step", calculateStep($(this).val()));
    updatePlot();
    initializeSliders();
    saveParametersToURL();
  });

  $("#min-x, #max-x, #min-y, #max-y").on("change keyup", function() {
    updatePlot();
    saveParametersToURL();
  });

  $("#order").on("change keyup", function() {
    saveParametersToURL();
    initializeParameters();
  });

  $("#poly-order").on("change keyup", function() {
    $("#order").val($(this).val());
    saveParametersToURL();
    initializeParameters();
  });

  $(window).on('resize', () => Plotly.Plots.resize(document.getElementById('plot')));

  $("#panel-toggle").on("click", function() {
    $(this).toggleClass('open').toggleClass('close');
    $("#panel").toggle();
    $(this).find('i').toggleClass('fa-xmark').toggleClass('fa-arrow-down');
  });

  $("#sidebar-toggle").on('click', function() {
    $(this).toggleClass('open').toggleClass('close');
    $("#sidebar").toggleClass('open');
    $(this).find('i').toggleClass('fa-arrow-left').toggleClass('fa-xmark');
  });

  $("#plot-points-button").on('click', function() {
    if($("#csv-input").val()) {
      csvPoints = $("#csv-input").val().trim().split('\n').map(line => {
        const [x, y] = line.trim().split(/[,\s\t]+/).map(Number);
        return { x, y };
      });
      updatePlot();
      saveParametersToURL();
    }
  });
  
  $("#float-button").on("click", function() {
    $("#panel").toggleClass("float");
    const isFloating = $("#panel").hasClass("float");
    $(this).text(isFloating ? "Dock Panel" : "Float Panel");
    $(window).scrollTop($(document).height());
  });

  $("#generate-button").on('click', function() {
    const order = parseInt($("#poly-order").val());
    const intercept = $("#intercept").val() ? parseFloat($("#intercept").val()) : null;
    if (csvPoints.length > 0) {
      const x = csvPoints.map(point => point.x);
      const y = csvPoints.map(point => point.y);
      const polyfit = new Polyfit(x, y);
      let coefficients = polyfit.computeCoefficients(order);
      coefficients.forEach((c, i) => {
        if (i <= MAX_ORDER) { $(`#${String.fromCharCode(97 + i)}`).val(c); }
      });
      initializeSliders();
      updatePlot();
      saveParametersToURL();
      $("#order").val(order);
    }
  });
  
  initializeParameters();

});
