# Polynomial Visualizer

Polynomial Visualizer is a web application that allows users to visualize polynomial functions. Users can interactively change the parameters of the polynomial and see the resulting graph update in real-time.

## Features

- Interactive user interface to adjust polynomial parameters.
- Visualization of polynomial graphs using Plotly.
- Adjustable axes ranges for better graph analysis.
- Reset functionality to quickly revert to default settings.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- jQuery
- jQuery UI
- Plotly.js

## Getting Started

### Prerequisites

Ensure you have the following installed:

- A modern web browser (e.g., Google Chrome, Mozilla Firefox)
- An internet connection (for loading external libraries)

### Installation

1. Clone the repository:

   ```bash
   git clone git@github.com:dewmguy/PolynomialVisualizer.git
   ```

2. Navigate to the project directory:

   ```bash
   cd PolynomialVisualizer
   ```

3. Open `index.html` in your web browser.

### Usage

1. **Order Selection**: Use the input field labeled `Order` to set the degree of the polynomial (1-6).
2. **X-axis Range**: Adjust the minimum and maximum X values using the respective input fields.
3. **Y-axis Range**: Adjust the minimum and maximum Y values using the respective input fields.
4. **Parameters**: Adjust the polynomial parameters in the dynamically generated input fields.
5. **Reset**: Click the `Reset` button to revert all settings to their default values.
6. The polynomial formula and its graph will be displayed and updated in real-time.

## File Structure

- `index.html`: The main HTML file that contains the structure of the web application.
- `styles.css`: The CSS file for styling the web application.
- `script.js`: The JavaScript file containing the logic for interactive elements and visualization.

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Polynomial Visualizer</title>
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
    <link rel="stylesheet" href="styles.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"></script>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
    <div class="controls">
        <div class="group">
            <div class="input-group">
                <button id="reset-button">Reset</button>
            </div>
            <div class="input-group">
                <label for="order">Order:</label>
                <input type="number" id="order" value="4" min="1" max="6" step="1">
            </div>
            <div class="input-group">
                <label for="min-x">-</label>
                <input type="number" id="min-x" value="0">
                <label>X</label>
                <input type="number" id="max-x" value="100">
                <label for="max-x">+</label>
            </div>
            <div class="input-group">
                <label for="min-y">-</label>
                <input type="number" id="min-y" value="0">
                <label>Y</label>
                <input type="number" id="max-y" value="100">
                <label for="max-y">+</label>
            </div>
        </div>
        <div class="group" id="parameter-group">
        </div>
    </div>
    <div class="formula" id="debug-output"></div>
    <div id="plot"></div>
    <script src="script.js"></script>
</body>
</html>
```

### styles.css

```css
* {
    margin: 0;
    border: 0;
    padding: 0;
    outline: 0;
}

body {
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
}

.controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 20px;
    gap: 50px;
    background-color: #f7f7f7;
    border-bottom: 1px solid #ddd;
    width: 100vw;
}

.formula {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px 0;
    background-color: #d7d7d7;
    border-bottom: 1px solid #ddd;
    width: 100vw;
}

.input-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-direction: row;
    gap: 15px;
    justify-content: center;
}

.input-group label {
    margin-bottom: 0;
}

.input-group input {
    width: 18ch;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 5px;
}

.slider {
    width: 150px;
}

.group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    flex-direction: column;
}

#plot {
    width: 99vw;
    height: 100%;
}

.ui-slider .ui-slider-handle {
    background-color: #007bff;
    border: none;
}

.ui-slider .ui-slider-range {
    background-color: #007bff;
}

#debug-output {
    font-family: monospace;
}

button {
    padding: .5em 5em;
    border: 1px solid #ddd;
    border-radius: 5px;
}

.red { color: #F00 !important }
.small { font-size: .7em !important }
```

### script.js

```javascript
$(document).ready(function() {
    function createParameterInputs(order) {
        let parameterGroup = $('#parameter-group');
        parameterGroup.empty();
        for (let i = 0; i <= order; i++) {
            parameterGroup.append(`
                <div class="input-group">
                    <label for="coeff-${i}">a<sub>${i}</sub>:</label>
                    <input type="number" id="coeff-${i}" value="${Math.random() * 10}" step="0.1">
                </div>
            `);
        }
    }

    function getPolynomial() {
        let order = parseInt($('#order').val());
        let coefficients = [];
        for (let i = 0; i <= order; i++) {
            coefficients.push(parseFloat($(`#coeff-${i}`).val()));
        }
        return coefficients;
    }

    function plotPolynomial(coefficients, minX, maxX, minY, maxY) {
        let xValues = [];
        let yValues = [];
        for (let x = minX; x <= maxX; x += 0.1) {
            let y = 0;
            coefficients.forEach((coeff, index) => {
                y += coeff * Math.pow(x, index);
            });
            xValues.push(x);
            yValues.push(y);
        }

        let trace = {
            x: xValues,
            y: yValues,
            type: 'scatter'
        };

        let layout = {
            xaxis: {
                range: [minX, maxX]
            },
            yaxis: {
                range: [minY, maxY]
            }
        };

        Plotly.newPlot('plot', [trace], layout);
    }

    $('#order').on('input', function() {
        createParameterInputs(parseInt($(this).val()));
    });

    $('#reset-button').on('click', function() {
        createParameterInputs(parseInt($('#order').val()));
    });

    $('body').on('input', 'input', function() {
        let coefficients = getPolynomial();
        let minX = parseFloat($('#min-x').val());
        let maxX = parseFloat($('#max-x').val());
        let minY = parseFloat($('#min-y').val());
        let maxY = parseFloat($('#max-y').val());
        plotPolynomial(coefficients, minX, maxX, minY, maxY);
    });

    createParameterInputs(parseInt($('#order').val()));
    plotPolynomial(getPolynomial(), 0, 100, 0, 100);
});
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/fooBar`).
3. Commit your changes (`git commit -am 'Add some fooBar'`).
4. Push to the branch (`git push origin feature/fooBar`).
5. Create a new Pull Request.

## Acknowledgements

- [jQuery](https://jquery.com/)
- [jQuery UI](https://jqueryui.com/)
- [Plotly.js](https://plotly.com/javascript/)

---

This README provides an overview of the project, installation instructions, usage guidelines, and other relevant information.
