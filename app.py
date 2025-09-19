from flask import Flask, request, jsonify, render_template, send_file, redirect, url_for, flash
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import openai
import pandas as pd
import os
from dotenv import load_dotenv
import json
import io
import base64
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure secret key for sessions
app.secret_key = 'led-bom-secret-key-2024'

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

# Initialize OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')

# User class for Flask-Login
class User(UserMixin):
    def __init__(self, id):
        self.id = id

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

class LEDBOMGenerator:
    def __init__(self):
        self.led_components = {
            'led_chips': ['LED Chip', 'LED Driver IC', 'Thermal Pad'],
            'optics': ['Lens', 'Reflector', 'Diffuser', 'Optical Film'],
            'thermal': ['Heat Sink', 'Thermal Interface Material', 'Thermal Pad'],
            'electrical': ['PCB', 'Connector', 'Wire', 'Resistor', 'Capacitor'],
            'mechanical': ['Housing', 'Mounting Bracket', 'Screw', 'Gasket'],
            'control': ['Microcontroller', 'Sensor', 'Switch', 'Potentiometer']
        }
        self.model_database = None
        self.load_model_database()
    
    def load_model_database(self):
        """Load the Tangra model database from Excel file"""
        try:
            # Load the Excel file
            df = pd.read_excel('Tangra full models with parts-2nd Sept 2025.xlsx')
            
            # Clean the data - remove rows with missing model names
            df = df.dropna(subset=['Model'])
            
            # Convert QR code to string for consistent lookup
            df['QR code'] = df['QR code'].astype(str)
            
            # Remove duplicate models (keep first occurrence)
            df = df.drop_duplicates(subset=['Model'], keep='first')
            
            # Remove duplicate QR codes (keep first occurrence)
            df = df.drop_duplicates(subset=['QR code'], keep='first')
            
            # Create lookup dictionaries
            self.model_database = {
                'by_model': df.set_index('Model').to_dict('index'),
                'by_qr_code': df.set_index('QR code').to_dict('index'),
                'dataframe': df
            }
            
            print(f"Loaded {len(df)} models from Tangra database")
            
        except Exception as e:
            print(f"Error loading model database: {e}")
            self.model_database = None
    
    def search_model(self, query):
        """Search for models by model name or QR code"""
        if not self.model_database:
            return None
        
        query = str(query).strip()
        
        # Search by exact model name
        if query in self.model_database['by_model']:
            return self.model_database['by_model'][query]
        
        # Search by QR code
        if query in self.model_database['by_qr_code']:
            return self.model_database['by_qr_code'][query]
        
        # Search by partial model name
        df = self.model_database['dataframe']
        partial_matches = df[df['Model'].str.contains(query, case=False, na=False)]
        
        if not partial_matches.empty:
            return partial_matches.iloc[0].to_dict()
        
        return None
    
    def generate_bom_from_model(self, model_data, po_number=None):
        """Generate BOM from model data"""
        if not model_data:
            return None
        
        # Extract components from model data
        components = []
        
        # Use original Excel column names as categories
        component_mapping = {
            'Heatsink': 'Heatsink',
            'Trim': 'Trim',
            'Lens / reflector': 'Lens / reflector',
            'Lens holder or glass': 'Lens holder or glass',
            'LED bracket': 'LED bracket',
            'LED': 'LED'
        }
        
        for column, category in component_mapping.items():
            if column in model_data and pd.notna(model_data[column]):
                components.append({
                    'part_number': model_data[column],
                    'description': model_data[column],
                    'category': category,
                    'quantity': 1
                })
        
        # Create BOM structure
        bom = {
            'bom_id': f"BOM-{model_data.get('QR code', 'UNKNOWN')}",
            'project_name': f"LED Model: {model_data.get('Model', 'Unknown')}",
            'model_name': model_data.get('Model', 'Unknown'),
            'qr_code': model_data.get('QR code', 'Unknown'),
            'po_number': po_number or 'N/A',
            'total_components': len(components),
            'categories': self._group_components_by_category(components),
            'raw_components': components
        }
        
        return bom
    
    def _group_components_by_category(self, components):
        """Group components by category"""
        categories = {}
        
        for component in components:
            category = component['category']
            if category not in categories:
                categories[category] = {
                    'category': category,
                    'components': []
                }
            categories[category]['components'].append(component)
        
        return list(categories.values())
    
    def generate_pdf_bom(self, bom_data):
        """Generate PDF from BOM data"""
        try:
            # Create a BytesIO buffer to store the PDF
            buffer = io.BytesIO()
            
            # Create the PDF document
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, 
                                  topMargin=72, bottomMargin=18)
            
            # Get styles
            styles = getSampleStyleSheet()
            
            # Create custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=14,
                spaceAfter=15,
                alignment=1,  # Center alignment
                textColor=colors.darkblue
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=10,
                spaceAfter=6,
                textColor=colors.darkblue
            )
            
            # Build the PDF content
            story = []
            
            # Title
            story.append(Paragraph("LED BILL OF MATERIALS", title_style))
            story.append(Spacer(1, 12))
            
            # Project information
            project_info = [
                ['BOM ID:', bom_data.get('bom_id', 'N/A')],
                ['Project:', bom_data.get('project_name', 'N/A')],
                ['Model:', bom_data.get('model_name', 'N/A')],
                ['QR Code:', bom_data.get('qr_code', 'N/A')],
                ['P.O. Number:', bom_data.get('po_number', 'N/A')],
                ['Total Components:', str(bom_data.get('total_components', 0))],
                ['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
            ]
            
            project_table = Table(project_info, colWidths=[1.5*inch, 3*inch])
            project_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('BACKGROUND', (1, 0), (1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(project_table)
            story.append(Spacer(1, 10))
            
            # Components by category
            if bom_data.get('categories'):
                for category in bom_data['categories']:
                    story.append(Paragraph(f"{category['category']}", heading_style))
                    
                    if category.get('components'):
                        # Create table for components
                        component_data = [['Part Number', 'Quantity']]
                        
                        for component in category['components']:
                            component_data.append([
                                component.get('part_number', 'N/A'),
                                str(component.get('quantity', 0))
                            ])
                        
                        component_table = Table(component_data, colWidths=[3.5*inch, 0.8*inch])
                        component_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 8),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black),
                            ('FONTSIZE', (0, 1), (-1, -1), 7),
                            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ]))
                        
                        story.append(component_table)
                        story.append(Spacer(1, 8))
                    else:
                        story.append(Paragraph("No components in this section.", styles['Normal']))
                        story.append(Spacer(1, 5))
            
            # Signature section
            story.append(Spacer(1, 15))
            
            signature_table = Table([
                ['Done By: _________________________', 'Date: _________________________']
            ], colWidths=[3*inch, 3*inch])
            signature_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('LINEBELOW', (0, 0), (0, 0), 1, colors.black),
                ('LINEBELOW', (1, 0), (1, 0), 1, colors.black),
            ]))
            
            story.append(signature_table)
            
            # Footer
            story.append(Spacer(1, 10))
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                alignment=1  # Center alignment
            )
            story.append(Paragraph("Generated by LED BOM Generator", footer_style))
            
            # Build PDF
            doc.build(story)
            
            # Get the PDF data
            buffer.seek(0)
            pdf_data = buffer.getvalue()
            buffer.close()
            
            return pdf_data
            
        except Exception as e:
            raise Exception(f"Error generating PDF: {str(e)}")
    
    def _get_similar_models(self, query, limit=5):
        """Get similar model names for suggestions"""
        if not self.model_database:
            return []
        
        df = self.model_database['dataframe']
        query_lower = query.lower()
        
        # Find models that contain the query
        similar = df[df['Model'].str.contains(query_lower, case=False, na=False)]
        
        if similar.empty:
            # If no matches, find models that start with similar letters
            similar = df[df['Model'].str.startswith(query_lower[:3], case=False, na=False)]
        
        return similar['Model'].head(limit).tolist()
    
    def get_available_models(self, limit=50):
        """Get list of available models"""
        if not self.model_database:
            return []
        
        df = self.model_database['dataframe']
        return df[['Model', 'QR code']].head(limit).to_dict('records')
    
    def parse_csv_data(self, file_content):
        """Parse CSV file content and extract LED component data"""
        try:
            # Try to decode if it's base64 encoded
            if isinstance(file_content, str) and file_content.startswith('data:'):
                file_content = base64.b64decode(file_content.split(',')[1])
            
            # Read CSV
            df = pd.read_csv(io.StringIO(file_content.decode('utf-8')))
            return df.to_dict('records')
        except Exception as e:
            raise Exception(f"Error parsing CSV: {str(e)}")
    
    def parse_xlsx_data(self, file_content):
        """Parse XLSX file content and extract LED component data"""
        try:
            # Try to decode if it's base64 encoded
            if isinstance(file_content, str) and file_content.startswith('data:'):
                file_content = base64.b64decode(file_content.split(',')[1])
            
            # Read XLSX
            df = pd.read_excel(io.BytesIO(file_content))
            return df.to_dict('records')
        except Exception as e:
            raise Exception(f"Error parsing XLSX: {str(e)}")
    
    def generate_bom_with_openai(self, led_data, user_input=""):
        """Generate BOM using OpenAI API"""
        try:
            # Prepare context for OpenAI
            context = f"""
            You are an expert LED lighting engineer creating a Bill of Materials (BOM) for LED light components.
            
            LED Data provided:
            {json.dumps(led_data, indent=2)}
            
            User requirements: {user_input}
            
            Please create a comprehensive BOM that includes:
            1. Component categories (LED Chips, Optics, Thermal Management, Electrical, Mechanical, Control)
            2. Specific part numbers, descriptions, quantities, and suppliers
            3. Cost estimates where applicable
            4. Technical specifications
            
            Format the response as a structured JSON with the following structure:
            {{
                "bom_id": "BOM-001",
                "project_name": "LED Light Assembly",
                "total_components": 0,
                "estimated_cost": "$0.00",
                "categories": [
                    {{
                        "category": "LED Chips",
                        "components": [
                            {{
                                "part_number": "string",
                                "description": "string",
                                "quantity": 0,
                                "unit_cost": "$0.00",
                                "total_cost": "$0.00",
                                "supplier": "string",
                                "specifications": {{}}
                            }}
                        ]
                    }}
                ]
            }}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert LED lighting engineer specializing in Bill of Materials creation."},
                    {"role": "user", "content": context}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            # Extract and parse the JSON response
            content = response.choices[0].message.content
            # Try to extract JSON from the response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_content = content[start_idx:end_idx]
                return json.loads(json_content)
            else:
                # Fallback: return a structured response
                return {
                    "bom_id": "BOM-001",
                    "project_name": "LED Light Assembly",
                    "total_components": 0,
                    "estimated_cost": "$0.00",
                    "categories": [],
                    "raw_response": content
                }
                
        except Exception as e:
            raise Exception(f"Error generating BOM with OpenAI: {str(e)}")

# Initialize BOM generator
bom_generator = LEDBOMGenerator()

# Login routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == 'admin' and password == 'LotusAdmin':
            user = User('admin')
            login_user(user)
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    try:
        data = request.get_json()
        user_input = data.get('message', '')
        
        # First try to search for a model in the database
        model_data = bom_generator.search_model(user_input)
        
        if model_data:
            # Generate BOM from model data
            bom = bom_generator.generate_bom_from_model(model_data)
            
            return jsonify({
                'success': True,
                'bom': bom,
                'message': f'BOM generated for model: {model_data.get("Model", "Unknown")}',
                'model_found': True
            })
        else:
            # Fallback to AI generation for general queries
            led_data = [{
                "type": "LED Light",
                "description": user_input,
                "wattage": "Unknown",
                "color_temperature": "Unknown",
                "luminous_flux": "Unknown"
            }]
            
            # Generate BOM using AI
            bom = bom_generator.generate_bom_with_openai(led_data, user_input)
            
            return jsonify({
                'success': True,
                'bom': bom,
                'message': 'BOM generated using AI (model not found in database)',
                'model_found': False
            })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/search-model', methods=['POST'])
@login_required
def search_model():
    """Search for a specific model and generate BOM"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        po_number = data.get('po_number', None)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query parameter is required'
            }), 400
        
        # Search for the model
        model_data = bom_generator.search_model(query)
        
        if not model_data:
            return jsonify({
                'success': False,
                'error': f'Model "{query}" not found in database',
                'suggestions': bom_generator._get_similar_models(query)
            }), 404
        
        # If P.O. number is provided, generate BOM immediately
        if po_number:
            bom = bom_generator.generate_bom_from_model(model_data, po_number)
            return jsonify({
                'success': True,
                'bom': bom,
                'model_data': model_data,
                'message': f'BOM generated for model: {model_data.get("Model", "Unknown")}'
            })
        else:
            # Return model data without BOM for P.O. number input
            return jsonify({
                'success': True,
                'model_data': model_data,
                'message': f'Model found: {model_data.get("Model", "Unknown")}. Please enter P.O. number.'
            })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/models', methods=['GET'])
@login_required
def get_models():
    """Get list of available models"""
    try:
        limit = request.args.get('limit', 50, type=int)
        models = bom_generator.get_available_models(limit)
        
        return jsonify({
            'success': True,
            'models': models,
            'total_count': len(models)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/export-pdf', methods=['POST'])
@login_required
def export_pdf():
    """Export BOM as PDF"""
    try:
        data = request.get_json()
        bom_data = data.get('bom')
        
        if not bom_data:
            return jsonify({
                'success': False,
                'error': 'BOM data is required'
            }), 400
        
        # Generate PDF
        pdf_data = bom_generator.generate_pdf_bom(bom_data)
        
        # Create a BytesIO object for the PDF
        pdf_buffer = io.BytesIO(pdf_data)
        pdf_buffer.seek(0)
        
        # Generate filename
        model_name = bom_data.get('model_name', 'Unknown').replace(' ', '_')
        bom_id = bom_data.get('bom_id', 'BOM').replace(' ', '_')
        filename = f"{bom_id}_{model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/upload-csv', methods=['POST'])
@login_required
def upload_csv():
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        # Read file content
        file_content = file.read()
        
        # Parse CSV data
        led_data = bom_generator.parse_csv_data(file_content)
        
        # Generate BOM
        bom = bom_generator.generate_bom_with_openai(led_data)
        
        return jsonify({
            'success': True,
            'bom': bom,
            'message': f'BOM generated successfully from CSV with {len(led_data)} LED entries'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/upload-xlsx', methods=['POST'])
@login_required
def upload_xlsx():
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        # Read file content
        file_content = file.read()
        
        # Parse XLSX data
        led_data = bom_generator.parse_xlsx_data(file_content)
        
        # Generate BOM
        bom = bom_generator.generate_bom_with_openai(led_data)
        
        return jsonify({
            'success': True,
            'bom': bom,
            'message': f'BOM generated successfully from XLSX with {len(led_data)} LED entries'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/sample-data', methods=['GET'])
@login_required
def get_sample_data():
    """Return sample LED data for testing"""
    sample_data = [
        {
            "model": "LED-001",
            "type": "High Power LED",
            "wattage": "10W",
            "color_temperature": "3000K",
            "luminous_flux": "1000lm",
            "voltage": "12V",
            "current": "800mA",
            "cri": "90+",
            "beam_angle": "120°"
        },
        {
            "model": "LED-002", 
            "type": "COB LED",
            "wattage": "20W",
            "color_temperature": "4000K",
            "luminous_flux": "2000lm",
            "voltage": "24V",
            "current": "1000mA",
            "cri": "95+",
            "beam_angle": "60°"
        },
        {
            "model": "LED-003",
            "type": "SMD LED",
            "wattage": "5W",
            "color_temperature": "5000K", 
            "luminous_flux": "500lm",
            "voltage": "6V",
            "current": "700mA",
            "cri": "80+",
            "beam_angle": "180°"
        }
    ]
    
    return jsonify({
        'success': True,
        'sample_data': sample_data
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)
