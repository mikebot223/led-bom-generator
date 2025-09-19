// LED BOM Chatbot JavaScript
let currentBOM = null;
let pendingBOM = null; // Store BOM data while waiting for P.O. number
let pendingModelData = null; // Store model data while waiting for P.O. number

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setupInputMethodHandlers();
});

function initializeEventListeners() {
    // Input method change handlers
    const inputMethods = document.querySelectorAll('input[name="inputMethod"]');
    inputMethods.forEach(method => {
        method.addEventListener('change', handleInputMethodChange);
    });
    
    // File input handler
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }
}

function setupInputMethodHandlers() {
    const modelInput = document.getElementById('modelInput');
    const textInput = document.getElementById('textInput');
    const csvInput = document.getElementById('csvInput');
    const xlsxInput = document.getElementById('xlsxInput');
    const fileUploadSection = document.getElementById('fileUploadSection');
    const modelSearchSection = document.getElementById('modelSearchSection');
    const messageInput = document.getElementById('messageInput');
    
    if (modelInput) {
        modelInput.addEventListener('change', function() {
            if (this.checked) {
                fileUploadSection.style.display = 'none';
                modelSearchSection.style.display = 'block';
                messageInput.placeholder = 'Enter model name or QR code to search...';
            }
        });
    }
    
    if (textInput) {
        textInput.addEventListener('change', function() {
            if (this.checked) {
                fileUploadSection.style.display = 'none';
                modelSearchSection.style.display = 'none';
                messageInput.placeholder = 'Describe your LED light requirements...';
            }
        });
    }
    
    if (csvInput) {
        csvInput.addEventListener('change', function() {
            if (this.checked) {
                fileUploadSection.style.display = 'block';
                modelSearchSection.style.display = 'none';
                fileInput.accept = '.csv';
                messageInput.placeholder = 'Upload a CSV file with LED data...';
            }
        });
    }
    
    if (xlsxInput) {
        xlsxInput.addEventListener('change', function() {
            if (this.checked) {
                fileUploadSection.style.display = 'block';
                modelSearchSection.style.display = 'none';
                fileInput.accept = '.xlsx';
                messageInput.placeholder = 'Upload an XLSX file with LED data...';
            }
        });
    }
}

function handleInputMethodChange(event) {
    const method = event.target.value;
    const fileUploadSection = document.getElementById('fileUploadSection');
    const messageInput = document.getElementById('messageInput');
    
    if (method === 'text') {
        fileUploadSection.style.display = 'none';
        messageInput.placeholder = 'Describe your LED light requirements...';
    } else {
        fileUploadSection.style.display = 'block';
        const accept = method === 'csv' ? '.csv' : '.xlsx';
        document.getElementById('fileInput').accept = accept;
        messageInput.placeholder = `Upload a ${method.toUpperCase()} file with LED data...`;
    }
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('File selected:', file.name);
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function handleModelSearchKeyPress(event) {
    if (event.key === 'Enter') {
        searchModel();
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    messageInput.value = '';
    
    // Show loading
    showLoading();
    
    try {
        // First try to search for a model
        const searchResponse = await fetch('/api/search-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: message })
        });
        
        const searchData = await searchResponse.json();
        
        if (searchData.success) {
            if (searchData.bom) {
                // BOM already generated with P.O. number
                currentBOM = searchData.bom;
                addMessageToChat(`Found model: ${searchData.bom.model_name}. BOM generated successfully! P.O. Number: ${searchData.bom.po_number}`, 'bot', true);
            } else {
                // Show P.O. number modal before generating BOM
                showPOModalForModel(searchData.model_data);
            }
        } else {
            // Model not found, fallback to AI generation
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentBOM = data.bom;
                const messageText = data.model_found ? 
                    `BOM generated for model: ${data.bom.model_name || 'Unknown'}` : 
                    'BOM generated successfully! Click to view details.';
                addMessageToChat(messageText, 'bot', true);
            } else {
                addMessageToChat(`Error: ${data.error}`, 'bot');
            }
        }
    } catch (error) {
        addMessageToChat(`Error: ${error.message}`, 'bot');
    } finally {
        hideLoading();
    }
}

async function searchModel() {
    const modelSearchInput = document.getElementById('modelSearchInput');
    const query = modelSearchInput.value.trim();
    
    if (!query) {
        alert('Please enter a model name or QR code.');
        return;
    }
    
    // Add user message to chat
    addMessageToChat(`Searching for model: ${query}`, 'user');
    modelSearchInput.value = '';
    
    // Show loading
    showLoading();
    
    try {
        const response = await fetch('/api/search-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.bom) {
                // BOM already generated with P.O. number
                currentBOM = data.bom;
                addMessageToChat(`Found model: ${data.bom.model_name}. BOM generated successfully! P.O. Number: ${data.bom.po_number}`, 'bot', true);
            } else {
                // Show P.O. number modal before generating BOM
                showPOModalForModel(data.model_data);
            }
        } else {
            let errorMessage = `Error: ${data.error}`;
            if (data.suggestions && data.suggestions.length > 0) {
                errorMessage += `\n\nSimilar models found:\n${data.suggestions.join('\n')}`;
            }
            addMessageToChat(errorMessage, 'bot');
        }
    } catch (error) {
        addMessageToChat(`Error: ${error.message}`, 'bot');
    } finally {
        hideLoading();
    }
}

async function showAvailableModels() {
    const modelsModal = new bootstrap.Modal(document.getElementById('modelsModal'));
    modelsModal.show();
    
    // Show loading in modal
    const modelsContent = document.getElementById('modelsContent');
    modelsContent.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading models...</span>
            </div>
            <p>Loading available models...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/models?limit=100');
        const data = await response.json();
        
        if (data.success) {
            displayModels(data.models);
        } else {
            modelsContent.innerHTML = `<div class="alert alert-danger">Error loading models: ${data.error}</div>`;
        }
    } catch (error) {
        modelsContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

function displayModels(models) {
    const modelsContent = document.getElementById('modelsContent');
    
    if (!models || models.length === 0) {
        modelsContent.innerHTML = '<div class="alert alert-info">No models available.</div>';
        return;
    }
    
    let html = `
        <div class="row">
            <div class="col-12">
                <p class="text-muted">Click on a model to generate its BOM</p>
                <div class="list-group">
    `;
    
    models.forEach(model => {
        html += `
            <button class="list-group-item list-group-item-action" onclick="selectModel('${model.Model}', '${model['QR code']}')">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${model.Model}</h6>
                    <small>QR: ${model['QR code']}</small>
                </div>
            </button>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    modelsContent.innerHTML = html;
}

function selectModel(modelName, qrCode) {
    // Close the modal
    const modelsModal = bootstrap.Modal.getInstance(document.getElementById('modelsModal'));
    modelsModal.hide();
    
    // Set the search input and trigger search
    const modelSearchInput = document.getElementById('modelSearchInput');
    modelSearchInput.value = modelName;
    
    // Trigger search
    searchModel();
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first.');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Show loading
    showLoading();
    
    try {
        const inputMethod = document.querySelector('input[name="inputMethod"]:checked').value;
        const endpoint = inputMethod === 'csv' ? '/api/upload-csv' : '/api/upload-xlsx';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentBOM = data.bom;
            addMessageToChat(data.message, 'bot', true);
        } else {
            addMessageToChat(`Error: ${data.error}`, 'bot');
        }
    } catch (error) {
        addMessageToChat(`Error: ${error.message}`, 'bot');
    } finally {
        hideLoading();
        fileInput.value = '';
    }
}

async function loadSampleData() {
    showLoading();
    
    try {
        const response = await fetch('/api/sample-data');
        const data = await response.json();
        
        if (data.success) {
            // Generate BOM from sample data
            const bomResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: `Generate BOM for these LED lights: ${JSON.stringify(data.sample_data)}` 
                })
            });
            
            const bomData = await bomResponse.json();
            
            if (bomData.success) {
                currentBOM = bomData.bom;
                addMessageToChat('Sample LED data loaded and BOM generated!', 'bot', true);
            } else {
                addMessageToChat(`Error generating BOM: ${bomData.error}`, 'bot');
            }
        } else {
            addMessageToChat(`Error loading sample data: ${data.error}`, 'bot');
        }
    } catch (error) {
        addMessageToChat(`Error: ${error.message}`, 'bot');
    } finally {
        hideLoading();
    }
}

function addMessageToChat(message, sender, hasBOM = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const icon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (hasBOM) {
        messageContent.innerHTML = `
            <i class="${icon}"></i>
            <div>
                <div>${message}</div>
                <button class="btn btn-primary btn-sm mt-2" onclick="showBOM()">
                    <i class="fas fa-list-alt"></i> View BOM
                </button>
            </div>
        `;
    } else {
        messageContent.innerHTML = `
            <i class="${icon}"></i>
            <div>${message}</div>
        `;
    }
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showBOM() {
    if (!currentBOM) {
        alert('No BOM data available.');
        return;
    }
    
    const bomContent = document.getElementById('bomContent');
    bomContent.innerHTML = generateBOMHTML(currentBOM);
    
    const bomModal = new bootstrap.Modal(document.getElementById('bomModal'));
    bomModal.show();
}

function generateBOMHTML(bom) {
    let html = `
        <div class="bom-summary">
            <h5><i class="fas fa-lightbulb"></i> ${bom.project_name || 'LED Light Assembly'}</h5>
            ${bom.model_name ? `<p class="text-muted"><strong>Model:</strong> ${bom.model_name}</p>` : ''}
            ${bom.qr_code ? `<p class="text-muted"><strong>QR Code:</strong> ${bom.qr_code}</p>` : ''}
            ${bom.po_number ? `<p class="text-muted"><strong>P.O. Number:</strong> ${bom.po_number}</p>` : ''}
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-value">${bom.total_components || 0}</div>
                    <div class="stat-label">Total Components</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${bom.categories ? bom.categories.length : 0}</div>
                    <div class="stat-label">Categories</div>
                </div>
            </div>
        </div>
    `;
    
    if (bom.categories && bom.categories.length > 0) {
        bom.categories.forEach(category => {
            html += `
                <div class="bom-category">
                    <h6><i class="fas fa-cog"></i> ${category.category}</h6>
                    <div class="components-list">
            `;
            
            if (category.components && category.components.length > 0) {
                category.components.forEach(component => {
                    html += `
                        <div class="component-item">
                            <div class="component-header">
                                <h6 class="component-name">${component.part_number || 'N/A'}</h6>
                            </div>
                            <div class="component-details">
                                <div><strong>Quantity:</strong> ${component.quantity || 0}</div>
                            </div>
                        </div>
                    `;
                });
            } else {
                html += '<p class="text-muted">No components in this section.</p>';
            }
            
            html += `
                    </div>
                </div>
            `;
        });
    } else {
        html += '<p class="text-muted">No components available in this BOM.</p>';
    }
    
    // Add raw response if available
    if (bom.raw_response) {
        html += `
            <div class="bom-category">
                <h6><i class="fas fa-code"></i> Raw AI Response</h6>
                <pre class="bg-light p-3 rounded">${bom.raw_response}</pre>
            </div>
        `;
    }
    
    return html;
}

function exportBOM() {
    if (!currentBOM) {
        alert('No BOM data to export.');
        return;
    }
    
    const dataStr = JSON.stringify(currentBOM, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `led-bom-${Date.now()}.json`;
    link.click();
}

async function exportPDF() {
    if (!currentBOM) {
        alert('No BOM data to export.');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bom: currentBOM })
        });
        
        if (response.ok) {
            // Get the filename from the response headers
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'led-bom.pdf';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            addMessageToChat('PDF exported successfully!', 'bot');
        } else {
            const errorData = await response.json();
            addMessageToChat(`Error exporting PDF: ${errorData.error}`, 'bot');
        }
    } catch (error) {
        addMessageToChat(`Error exporting PDF: ${error.message}`, 'bot');
    } finally {
        hideLoading();
    }
}

function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                <i class="fas fa-robot"></i>
                <div>
                    <strong>Welcome to LED BOM Generator!</strong><br>
                    I can help you create comprehensive Bill of Materials for LED light components. 
                    <br><br>
                    <strong>Quick Start:</strong><br>
                    • Search for a model by name or QR code<br>
                    • Browse available models<br>
                    • Describe your LED requirements<br>
                    • Upload CSV/XLSX files with LED data
                </div>
            </div>
        </div>
    `;
    currentBOM = null;
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// P.O. Number Modal Functions
function showPOModalForModel(modelData) {
    pendingModelData = modelData;
    const poModal = new bootstrap.Modal(document.getElementById('poModal'));
    const poInput = document.getElementById('poNumberInput');
    poInput.value = ''; // Clear previous input
    poModal.show();
    
    // Focus on input
    poInput.focus();
    
    // Add event listeners
    document.getElementById('confirmPoBtn').onclick = function() {
        const poNumber = poInput.value.trim();
        generateBOMWithPO(poNumber || 'N/A');
        poModal.hide();
    };
    
    // Handle Enter key in input
    poInput.onkeypress = function(event) {
        if (event.key === 'Enter') {
            const poNumber = poInput.value.trim();
            generateBOMWithPO(poNumber || 'N/A');
            poModal.hide();
        }
    };
}

function showPOModal(bomData) {
    pendingBOM = bomData;
    const poModal = new bootstrap.Modal(document.getElementById('poModal'));
    const poInput = document.getElementById('poNumberInput');
    poInput.value = ''; // Clear previous input
    poModal.show();
    
    // Focus on input
    poInput.focus();
    
    // Add event listeners
    document.getElementById('confirmPoBtn').onclick = function() {
        const poNumber = poInput.value.trim();
        finalizeBOMWithPO(poNumber || 'N/A');
        poModal.hide();
    };
    
    // Handle Enter key in input
    poInput.onkeypress = function(event) {
        if (event.key === 'Enter') {
            const poNumber = poInput.value.trim();
            finalizeBOMWithPO(poNumber || 'N/A');
            poModal.hide();
        }
    };
}

async function generateBOMWithPO(poNumber) {
    if (pendingModelData) {
        try {
            // Show loading
            showLoading();
            
            // Call the search-model API with P.O. number
            const response = await fetch('/api/search-model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    query: pendingModelData.Model || pendingModelData['QR code'],
                    po_number: poNumber
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentBOM = data.bom;
                addMessageToChat(`Found model: ${data.bom.model_name}. BOM generated successfully! P.O. Number: ${poNumber}`, 'bot', true);
            } else {
                addMessageToChat(`Error generating BOM: ${data.error}`, 'bot');
            }
        } catch (error) {
            addMessageToChat(`Error: ${error.message}`, 'bot');
        } finally {
            hideLoading();
            pendingModelData = null;
        }
    }
}

function finalizeBOMWithPO(poNumber) {
    if (pendingBOM) {
        // Add P.O. number to BOM data
        pendingBOM.po_number = poNumber;
        currentBOM = pendingBOM;
        
        // Display success message and BOM
        addMessageToChat(`Found model: ${pendingBOM.model_name}. BOM generated successfully! P.O. Number: ${poNumber}`, 'bot', true);
        
        // Clear pending BOM
        pendingBOM = null;
    }
}

// Utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Utility function to format numbers
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}
