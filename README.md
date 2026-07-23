# Polynomial Visualizer [🔗](https://dewmguy.github.io/PolynomialVisualizer/)

This web application allows users to perform polynomial regression on a set of data points and visualize the resulting polynomial curve. The app provides an intuitive interface to input data points, configure polynomial order, and adjust coefficients interactively.

![Screenshot](screenshot.png?raw=true "Screenshot of Plotting Window")

### Features

- **Data Input**: Enter data points.
- **Polynomial Regression**: Fit polynomial curves to the data points with adjustable order from 1 to 8.
- **Coefficient Adjustment**: Modify polynomial coefficients dynamically and see the effect on the curve in real-time.
- **Precision Sliders**: Each coefficient uses a nonlinear, range-aware slider. Movement is finest near the center, higher-order coefficients automatically receive smaller adjustments, and the Center button restores the slider's anchor value.
- **Visualization**: Interactive plotting using Plotly, displaying both the fitted polynomial and the original data points.
- **URL Parameters**: Save and share your configurations via URL parameters.
- **Input Safety**: Invalid points, underdetermined fits, malformed shared URLs, and invalid axis ranges are reported without breaking the plot.
- **Responsive Design**: Adjusts the plot to fit any screen size.


### Usage

1. **Input Data**: Enter data points in the provided input field.
2. **Set Polynomial Order**: Select the desired polynomial order (degree) for fitting.
3. **Adjust Coefficients**: Use the sliders or input fields to adjust the polynomial coefficients manually. The value present when a slider is initialized is its anchor; drag near the center for very fine changes, or select **Center** to restore that anchor exactly.
4. **Update Plot**: The polynomial curve and data points are plotted interactively as parameters are adjusted.
5. **Save and Share**: Configurations are saved in the URL as they change and can be shared directly. Plot datasets that exceed the safe URL size limit are intentionally omitted from the URL.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/dewmguy/PolynomialVisualizer.git
   ```

2. Open `index.html` in your web browser.

## File Structure

- `index.html`: The main HTML file that contains the structure of the web application.
- `styles.css`: The CSS file for styling the web application.
- `script.js`: The JavaScript file containing the logic for interactive elements and visualization.
- `polyfit.js`: The polynomial regression implementation.

## Technologies

- HTML5
- CSS3
- JavaScript
- jQuery
- jQuery UI
- Plotly.js
- LZ-String

Runtime dependencies are loaded from CDNs at exact versions with subresource-integrity hashes. `plotly-latest` is intentionally not used because it is frozen at Plotly.js 1.58.5.
- jQuery UI

## Acknowledgements

- **Plotly.js**: For plotting the polynomial curve and data points.
- **Polyfit.js**: Custom script for performing polynomial regression.
- **jQuery**: For DOM manipulation and event handling.
