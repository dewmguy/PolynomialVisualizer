# Polynomial Visualizer

This web application allows users to perform polynomial regression on a set of data points and visualize the resulting polynomial curve. The app provides an intuitive interface to input data points, configure polynomial order, and adjust coefficients interactively.

![Screenshot](screenshot.png?raw=true "Screenshot of Plotting Window")

### Features

- **Data Input**: Enter data points manually or via CSV input.
- **Polynomial Regression**: Fit polynomial curves to the data points with adjustable order from 1 to 6.
- **Coefficient Adjustment**: Modify polynomial coefficients dynamically and see the effect on the curve in real-time.
- **Visualization**: Interactive plotting using Plotly, displaying both the fitted polynomial and the original data points.
- **URL Parameters**: Save and share your configurations via URL parameters.
- **Responsive Design**: Adjusts the plot to fit any screen size.


### Usage

1. **Input Data**: Enter data points in the provided input field or load from a CSV file.
2. **Set Polynomial Order**: Select the desired polynomial order (degree) for fitting.
3. **Adjust Coefficients**: Use the sliders or input fields to adjust the polynomial coefficients manually.
4. **Specify Intercept**: Optionally set a custom intercept value.
5. **Update Plot**: The polynomial curve and data points are plotted interactively as parameters are adjusted.
6. **Save and Share**: Configurations can be saved and shared using URL parameters.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/dewmguy/PolynomialVisualizer.git
   ```

2. Navigate to the project directory:

   ```bash
   cd PolynomialVisualizer
   ```

3. Open `index.html` in your web browser.

## File Structure

- `index.html`: The main HTML file that contains the structure of the web application.
- `styles.css`: The CSS file for styling the web application.
- `script.js`: The JavaScript file containing the logic for interactive elements and visualization.

## Technologies

- HTML5
- CSS3
- JavaScript
- jQuery
- jQuery UI

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests for improvements and bug fixes.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/fooBar`).
3. Commit your changes (`git commit -am 'Add some fooBar'`).
4. Push to the branch (`git push origin feature/fooBar`).
5. Create a new Pull Request.

## Acknowledgements

- **Plotly.js**: For plotting the polynomial curve and data points.
- **Polyfit.js**: Custom script for performing polynomial regression.
- **jQuery**: For DOM manipulation and event handling.

---

This README provides an overview of the project, installation instructions, usage guidelines, and other relevant information.
