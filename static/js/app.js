/**
 * Main Application Logic for RAG Q&A System
 */

let apiClient;

document.addEventListener('DOMContentLoaded', function() {
    // 1. Dependency Check
    if (typeof APIClient === 'undefined') {
        console.error('Critical Error: api.js is not loaded.');
        document.body.innerHTML = '<div class="alert alert-danger m-4">Error: api.js is missing or failed to load.</div>';
        return;
    }

    // 2. Initialize API
    apiClient = new APIClient();

    // 3. Initialize UI Components
    initializeTheme();
    initializeDocumentUpload();
    initializeQueryForm();
    initializeStatusTab();
    initializeCollectionInfo();
    initializeHealthCheck();
    
    // 4. Initialize Bootstrap Tooltips
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
    }

    console.log('RAG Q&A System initialized');
});

/**
 * Theme Toggle (Light/Dark)
 */
function initializeTheme() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;
    
    const html = document.documentElement;
    const icon = toggleBtn.querySelector('i');

    toggleBtn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        icon.className = newTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    });
}

/**
 * Document Upload Logic
 */
function initializeDocumentUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const deleteBtn = document.getElementById('deleteCollectionBtn');

    if(!dropZone) return;

    // File Input Change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    });

    // Drag & Drop Events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
    });

    // Delete Collection
    if (deleteBtn) deleteBtn.addEventListener('click', handleDeleteCollection);
}

async function handleFileUpload(file) {
    const uploadResult = document.getElementById('uploadResult');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressContainer = document.getElementById('uploadProgress');

    // Validation
    if (!file.name.match(/\.(pdf|txt|csv)$/i)) {
        showToast('Invalid file format. Please upload PDF, TXT, or CSV.', 'error');
        return;
    }

    // Reset UI
    progressContainer.style.display = 'flex';
    progressBar.style.width = '0%';
    uploadResult.innerHTML = '';

    try {
        const { data, error } = await apiClient.uploadDocument(file, (progress) => {
            progressBar.style.width = `${Math.round(progress)}%`;
        });

        progressContainer.style.display = 'none';

        if (error) {
            uploadResult.innerHTML = `<div class="alert alert-danger">${error}</div>`;
            showToast(error, 'error');
        } else {
            uploadResult.innerHTML = `<div class="alert alert-success">Successfully uploaded <strong>${data.filename}</strong> (${data.chunks_created} chunks)</div>`;
            showToast('Upload successful', 'success');
            refreshCollectionInfo();
        }
    } catch (err) {
        progressContainer.style.display = 'none';
        showToast('Upload failed: ' + err.message, 'error');
    }
}

/**
 * Chat Interface Logic
 */
function initializeQueryForm() {
    const form = document.getElementById('queryForm');
    const textarea = document.getElementById('questionInput');

    if (!form || !textarea) return;

    // Handle Enter Key (Submit) vs Shift+Enter (New Line)
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = textarea.value.trim();
        if (!question) return;

        // Clear input and reset height
        textarea.value = '';
        textarea.style.height = 'auto';

        await handleQuerySubmit(question);
    });
}

async function handleQuerySubmit(question) {
    const includeSources = document.getElementById('includeSourcesCheck')?.checked;
    const enableEvaluation = document.getElementById('enableEvaluationCheck')?.checked;
    const useStreaming = document.getElementById('useStreamingCheck')?.checked;

    // 1. Add User Question Bubble
    appendMessage('user', question);

    // 2. Add AI Loading Bubble
    const aiBubbleId = `ai-bubble-${Date.now()}`;
    appendLoadingMessage(aiBubbleId);

    try {
        if (useStreaming) {
            await handleStreamingQuery(question, aiBubbleId);
        } else {
            await handleStandardQuery(question, includeSources, enableEvaluation, aiBubbleId);
        }
    } catch (err) {
        updateMessageContent(aiBubbleId, `<span class="text-danger">Error: ${err.message}</span>`);
    }
}

// ---- Chat UI Helpers ----

function appendMessage(role, text) {
    const history = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = `chat-message ${role}-message`;
    
    // Sanitize user input securely
    const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    div.innerHTML = `
        <div class="${role}-bubble shadow-sm">
            <div class="message-content">${safeText}</div>
        </div>
    `;
    history.appendChild(div);
    scrollToBottom();
}

function appendLoadingMessage(id) {
    const history = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = `chat-message ai-message`;
    div.innerHTML = `
        <div class="ai-bubble shadow-sm" id="${id}">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    history.appendChild(div);
    scrollToBottom();
}

function updateMessageContent(id, htmlContent) {
    const bubble = document.getElementById(id);
    if (bubble) {
        bubble.innerHTML = `<div class="message-content">${htmlContent}</div>`;
        
        // Syntax Highlighting (if library exists)
        if (typeof hljs !== 'undefined') {
            bubble.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
        }
        scrollToBottom();
    }
}

function scrollToBottom() {
    const history = document.getElementById('chatHistory');
    if(history) {
        requestAnimationFrame(() => {
            history.scrollTop = history.scrollHeight;
        });
    }
}

// ---- Query Handlers ----

async function handleStandardQuery(question, includeSources, enableEvaluation, bubbleId) {
    const { data, error } = await apiClient.query(question, includeSources, enableEvaluation);

    if (error) {
        updateMessageContent(bubbleId, `<span class="text-danger">${error}</span>`);
        return;
    }

    // Render Markdown
    let html = DOMPurify.sanitize(marked.parse(data.answer));

    // Append Extras
    if (includeSources && data.sources?.length) {
        html += renderSourcesInChat(data.sources);
    }
    if (enableEvaluation && data.evaluation) {
        html += renderEvaluationInChat(data.evaluation);
    }

    updateMessageContent(bubbleId, html);
}

// ★ CRITICAL FIX: Throttled Streaming to prevent freezing ★
async function handleStreamingQuery(question, bubbleId) {
    let fullAnswer = '';
    let lastRenderTime = 0;
    const RENDER_INTERVAL = 100; // Update UI max once every 100ms

    const { error } = await apiClient.queryStream(question, (chunk) => {
        fullAnswer += chunk;
        const now = Date.now();

        // Throttle updates
        if (now - lastRenderTime > RENDER_INTERVAL) {
             const html = DOMPurify.sanitize(marked.parse(fullAnswer));
             updateMessageContent(bubbleId, html);
             lastRenderTime = now;
        }
    });

    // Final render
    const finalHtml = DOMPurify.sanitize(marked.parse(fullAnswer));
    updateMessageContent(bubbleId, finalHtml);

    if (error) {
        updateMessageContent(bubbleId, finalHtml + `<br><span class="text-danger small">Stream Interrupted: ${error}</span>`);
    }
}

function renderSourcesInChat(sources) {
    if (!sources || sources.length === 0) return '';
    
    let html = `<div class="chat-sources mt-3 pt-2 border-top"><div class="fw-bold mb-2 text-muted small"><i class="bi bi-book me-1"></i> Sources:</div>`;
    sources.slice(0, 3).forEach((src, idx) => {
        const name = src.metadata.source || src.metadata.filename || `Doc ${idx+1}`;
        const page = src.metadata.page ? ` (p.${src.metadata.page})` : '';
        const preview = (src.content || "").substring(0, 150).replace(/"/g, '&quot;');
        
        html += `<span class="source-badge d-inline-block me-2 mb-2 p-1 px-2 border rounded bg-light small" 
                       data-bs-toggle="tooltip" title="${preview}..." style="cursor:help;">
            <i class="bi bi-file-text"></i> ${name}${page}
        </span>`;
    });
    html += `</div>`;
    return html;
}

function renderEvaluationInChat(evaluation) {
    return `<div class="mt-2 pt-2 border-top small text-muted d-flex gap-3">
        <span><i class="bi bi-check-circle"></i> Faithfulness: <strong>${evaluation.faithfulness?.toFixed(2) || 'N/A'}</strong></span>
        <span><i class="bi bi-bullseye"></i> Relevancy: <strong>${evaluation.answer_relevancy?.toFixed(2) || 'N/A'}</strong></span>
    </div>`;
}

/**
 * System Management (Status, Delete, Info)
 */
function handleDeleteCollection() {
    if(confirm('WARNING: Are you sure you want to delete all documents? This cannot be undone.')) {
        const btn = document.getElementById('deleteCollectionBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';
        btn.disabled = true;

        apiClient.deleteCollection().then(({error}) => {
            btn.innerHTML = originalText;
            btn.disabled = false;

            if(error) showToast(error, 'error');
            else {
                showToast('Collection deleted successfully', 'success');
                refreshCollectionInfo();
            }
        });
    }
}

function initializeStatusTab() {
    document.getElementById('refreshStatusBtn')?.addEventListener('click', refreshStatusInfo);
}

async function refreshStatusInfo() {
    const healthDiv = document.getElementById('healthStatusContent');
    const readyDiv = document.getElementById('readinessStatusContent');
    
    if (healthDiv) healthDiv.innerHTML = '<div class="spinner-border spinner-border-sm text-secondary"></div> Checking...';
    
    const [health, readiness] = await Promise.all([
        apiClient.healthCheck(),
        apiClient.readinessCheck()
    ]);

    if (healthDiv) {
        healthDiv.innerHTML = health.error ? 
            `<div class="alert alert-danger mb-2">${health.error}</div>` : 
            `<div class="alert alert-success py-2 mb-2"><i class="bi bi-check-circle me-2"></i>Service Status: <strong>${health.data.status}</strong></div>`;
    }

    if (readyDiv) {
        const isReady = readiness.data?.qdrant_connected;
        readyDiv.innerHTML = readiness.error ?
            `<div class="alert alert-danger">${readiness.error}</div>` :
            `<div class="alert alert-${isReady ? 'success' : 'warning'} py-2">
                <i class="bi bi-database me-2"></i>Qdrant Database: <strong>${isReady ? 'Connected' : 'Disconnected'}</strong>
             </div>`;
    }

    const timeEl = document.getElementById('lastUpdated');
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
}

function initializeCollectionInfo() {
    document.getElementById('refreshInfoBtn')?.addEventListener('click', refreshCollectionInfo);
}

async function refreshCollectionInfo() {
    const content = document.getElementById('collectionInfoContent');
    if (!content) return;
    
    content.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>';

    const { data, error } = await apiClient.getCollectionInfo();

    if (error) {
        content.innerHTML = `<div class="col-12"><div class="alert alert-danger">${error}</div></div>`;
        const badge = document.getElementById('docCount');
        if (badge) badge.textContent = '-';
    } else {
        const badge = document.getElementById('docCount');
        if (badge) badge.textContent = data.total_documents;
        
        // Simple statistic cards
        content.innerHTML = `
            <div class="col-md-4">
                <div class="card p-3 text-center border shadow-sm h-100">
                    <h2 class="text-primary mb-0">${data.total_documents}</h2>
                    <small class="text-muted">Documents</small>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-3 text-center border shadow-sm h-100">
                    <h2 class="text-info mb-0">${data.vectors_count || 0}</h2>
                    <small class="text-muted">Vectors</small>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-3 text-center border shadow-sm h-100">
                    <h2 class="text-success mb-0">${data.status}</h2>
                    <small class="text-muted">Status</small>
                </div>
            </div>
        `;
    }
}

function initializeHealthCheck() {
    // Initial check after load
    setTimeout(refreshStatusInfo, 1000);

    // Poll every 60s
    setInterval(async () => {
        const { data } = await apiClient.readinessCheck();
        const indicator = document.querySelector('#healthStatus .status-dot');
        const text = document.querySelector('#healthStatus span:last-child');
        
        if (indicator && text && data) {
            if (data.qdrant_connected) {
                indicator.className = 'status-dot healthy';
                text.textContent = 'Healthy';
            } else {
                indicator.className = 'status-dot unhealthy';
                text.textContent = 'Issues';
            }
        }
    }, 60000);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const id = 'toast-' + Date.now();
    const bgClass = type === 'error' ? 'text-bg-danger' : (type === 'success' ? 'text-bg-success' : 'text-bg-primary');
    
    const html = `
        <div id="${id}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body text-white">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const toastEl = temp.firstElementChild;
    container.appendChild(toastEl);
    
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    } else {
        setTimeout(() => toastEl.remove(), 3000);
    }
}