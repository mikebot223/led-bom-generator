// LED BOM Chatbot JavaScript
let currentBOM = null;
let pendingBOM = null; // Store BOM data while waiting for P.O. number
let pendingModelData = null; // Store model data while waiting for P.O. number

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // No sidebar elements to initialize
}



function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Removed - no longer needed

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



// Sidebar functions removed - no longer needed

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
