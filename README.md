# LED BOM Chatbot

An AI-powered chatbot application that generates comprehensive Bill of Materials (BOM) for LED light components using OpenAI's API. The application supports both text input and file uploads (CSV/XLSX) to create detailed component lists with specifications, costs, and suppliers.

## Features

- **Multiple Input Methods**: Text description, CSV upload, or XLSX upload
- **AI-Powered BOM Generation**: Uses OpenAI GPT-3.5-turbo for intelligent component analysis
- **Interactive Chat Interface**: Modern, responsive UI with real-time chat
- **Comprehensive BOM Output**: Structured component lists with categories, specifications, and costs
- **Sample Data**: Built-in sample LED data for testing
- **Export Functionality**: Export BOM as JSON or PDF

## Installation

### Quick Start (Recommended)

1. **Clone or download the project**
   ```bash
   cd led-bom-chatbot
   ```

2. **Run the setup script**
   ```bash
   ./run.sh
   ```

3. **Configure your OpenAI API key**
   - Edit the `.env` file and replace `your_openai_api_key_here` with your actual OpenAI API key

4. **Open your browser**
   Navigate to `http://localhost:5001`

### Manual Setup

1. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   - Create a `.env` file with your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

4. **Ensure Excel file is present**
   - Make sure `Tangra full models with parts-2nd Sept 2025.xlsx` is in the project directory

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open your browser**
   Navigate to `http://localhost:5001`

## Usage

### Model Search (Primary Method)
1. Select "Model" input method (default)
2. Enter a model name or QR code in the search field
3. Press Enter or click "Search Model"
4. View the generated BOM for that specific model
5. Alternatively, click "Browse Models" to see all available models

### Text Input
1. Select "Text" input method
2. Describe your LED light requirements in the chat input
3. Press Enter or click Send
4. View the generated BOM

### CSV Upload
1. Select "CSV" input method
2. Upload a CSV file with LED data (see sample format below)
3. Click "Upload & Generate BOM"
4. View the generated BOM

### XLSX Upload
1. Select "XLSX" input method
2. Upload an XLSX file with LED data
3. Click "Upload & Generate BOM"
4. View the generated BOM

### Sample Data
1. Click "Load Sample LED Data" to use built-in sample data
2. The system will automatically generate a BOM

## CSV/XLSX Format

Your data files should contain columns for LED specifications. Here's the expected format:

```csv
model,type,wattage,color_temperature,luminous_flux,voltage,current,cri,beam_angle
LED-001,High Power LED,10W,3000K,1000lm,12V,800mA,90+,120°
LED-002,COB LED,20W,4000K,2000lm,24V,1000mA,95+,60°
```

## API Endpoints

- `GET /` - Main application interface
- `POST /api/chat` - Generate BOM from text input
- `POST /api/search-model` - Search for specific model and generate BOM
- `GET /api/models` - Get list of available models
- `POST /api/upload-csv` - Generate BOM from CSV file
- `POST /api/upload-xlsx` - Generate BOM from XLSX file
- `POST /api/export-pdf` - Export BOM as PDF
- `GET /api/sample-data` - Get sample LED data

## BOM Output Structure

The generated BOM includes:

- **Project Information**: BOM ID, project name, total components, estimated cost
- **Component Categories**: 
  - LED Chips (LED Chip, Driver IC, Thermal Pad)
  - Optics (Lens, Reflector, Diffuser, Optical Film)
  - Thermal Management (Heat Sink, Thermal Interface Material)
  - Electrical (PCB, Connector, Wire, Resistor, Capacitor)
  - Mechanical (Housing, Mounting Bracket, Screw, Gasket)
  - Control (Microcontroller, Sensor, Switch, Potentiometer)

- **Component Details**: Part number, description, quantity, unit cost, total cost, supplier, specifications

## Export Options

### JSON Export
- Structured data format for integration with other systems
- Includes all BOM data in machine-readable format
- Filename: `led-bom-[timestamp].json`

### PDF Export
- Professional formatted document for sharing and printing
- Includes project information, component tables, and timestamps
- Organized by component categories with proper styling
- Filename: `[BOM_ID]_[Model_Name]_[timestamp].pdf`

## Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **AI Integration**: OpenAI GPT-3.5-turbo
- **File Processing**: Pandas, OpenPyXL
- **Styling**: Custom CSS with gradient designs

## Requirements

- Python 3.7+
- OpenAI API key
- Modern web browser

## Security Considerations

- API keys should be stored securely in environment variables
- File uploads are validated for type and size
- Input sanitization is implemented for all user inputs

## Troubleshooting

1. **OpenAI API Errors**: Ensure your API key is valid and has sufficient credits
2. **File Upload Issues**: Check file format and size limits
3. **CORS Errors**: Ensure Flask-CORS is properly configured
4. **Import Errors**: Verify all dependencies are installed

## Future Enhancements

- Database integration for BOM storage
- User authentication and BOM history
- Advanced filtering and search capabilities
- Integration with component supplier APIs
- Cost optimization suggestions
- 3D visualization of LED assemblies

## License

This project is for demonstration purposes. Please ensure you have proper licensing for any production use.
