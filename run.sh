#!/bin/bash

# LED BOM Chatbot Runner Script

echo "🚀 Starting LED BOM Chatbot..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv venv
    echo "✅ Virtual environment created."
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if [ ! -f "venv/pyvenv.cfg" ] || [ ! -d "venv/lib" ]; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    echo "✅ Dependencies installed."
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating template..."
    echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
    echo "📝 Please edit .env file and add your OpenAI API key."
fi

# Check if Excel file exists
if [ ! -f "Tangra full models with parts-2nd Sept 2025.xlsx" ]; then
    echo "❌ Excel file 'Tangra full models with parts-2nd Sept 2025.xlsx' not found!"
    echo "Please ensure the Excel file is in the project directory."
    exit 1
fi

echo "🎯 Starting Flask application..."
echo "🌐 Application will be available at: http://localhost:5001"
echo "📊 Model database will be loaded on startup..."
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Run the application
python app.py
