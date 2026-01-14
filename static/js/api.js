/**
 * API Client for communicating with the backend
 */
class APIClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    async uploadDocument(file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.baseUrl}/documents/upload`, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve({ data, error: null });
                    } catch (e) {
                        resolve({ data: null, error: 'Invalid response format' });
                    }
                } else {
                    let errorMessage = 'Upload failed';
                    try {
                        const err = JSON.parse(xhr.responseText);
                        errorMessage = err.detail || errorMessage;
                    } catch (e) {}
                    resolve({ data: null, error: errorMessage });
                }
            };

            xhr.onerror = () => resolve({ data: null, error: 'Network error occurred' });
            xhr.send(formData);
        });
    }

    async deleteCollection() {
        try {
            const response = await fetch(`${this.baseUrl}/documents/collection`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const err = await response.json();
                return { data: null, error: err.detail || 'Delete failed' };
            }
            return { data: { success: true }, error: null };
        } catch (err) {
            return { data: null, error: err.message };
        }
    }

    async getCollectionInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/documents/info`);
            const data = await response.json();
            return { data, error: null };
        } catch (err) {
            return { data: null, error: 'Failed to fetch info' };
        }
    }

    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            return { data, error: null };
        } catch (err) {
            return { data: null, error: 'Service unreachable' };
        }
    }

    async readinessCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health/ready`);
            const data = await response.json();
            return { data, error: null };
        } catch (err) {
            return { data: null, error: 'Service not ready' };
        }
    }

    async query(question, includeSources = true, enableEvaluation = false) {
        try {
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, include_sources: includeSources, enable_evaluation: enableEvaluation })
            });
            const data = await response.json();
            if (!response.ok) return { data: null, error: data.detail || 'Query failed' };
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err.message };
        }
    }

    async queryStream(question, onChunk) {
        try {
            const response = await fetch(`${this.baseUrl}/query/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            if (!response.ok) {
                const err = await response.json();
                return { error: err.detail || 'Streaming failed' };
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                if (onChunk) onChunk(chunk);
            }
            
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    }
}