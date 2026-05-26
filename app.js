document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // State Variables & Initialization
    // ==========================================================================
    let orders = [];
    let currencySymbol = '₹';
    let salesChart = null;
    let deliveryChart = null;

    // DOM Elements
    const ordersTbody = document.getElementById('orders-tbody');
    const emptyState = document.getElementById('empty-state');
    
    // KPI elements
    const valRevenue = document.getElementById('val-revenue');
    const valCost = document.getElementById('val-cost');
    const valProfit = document.getElementById('val-profit');
    const valMargin = document.getElementById('val-margin');
    const valDelivery = document.getElementById('val-delivery');
    
    // Control elements
    const searchInput = document.getElementById('search-input');
    const filterStatus = document.getElementById('filter-status');
    const sortBy = document.getElementById('sort-by');
    const currencySelect = document.getElementById('currency-select');
    
    // Button actions
    const newOrderBtn = document.getElementById('new-order-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const backupBtn = document.getElementById('backup-btn');
    const importFile = document.getElementById('import-file');
    
    // Login elements
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');

    // Modal elements
    const orderModal = document.getElementById('order-modal');
    const orderForm = document.getElementById('order-form');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const orderIdInput = document.getElementById('order-id');
    const orderStatusInput = document.getElementById('order-status');
    const deliveryDateGroup = document.getElementById('delivery-date-group');
    const deliveryDateInput = document.getElementById('delivery-date');
    const buyingPriceInput = document.getElementById('buying-price');
    const sellingPriceInput = document.getElementById('selling-price');
    const productNameInput = document.getElementById('product-name');
    const customerNameInput = document.getElementById('customer-name');
    const customerContactInput = document.getElementById('customer-contact');
    const orderDateInput = document.getElementById('order-date');
    const notesInput = document.getElementById('notes');

    // ==========================================================================
    // Dummy Seed Data (for a premium first-time experience)
    // ==========================================================================
    // Helper functions for relative dates
    function getRelativeDateString(daysOffset) {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        return d.toISOString().split('T')[0];
    }

    function getRelativeDateTimeString(daysOffset, hours, minutes) {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        d.setHours(hours, minutes, 0, 0);
        
        // Format as YYYY-MM-DDTHH:MM for datetime-local value
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${date}T${hh}:${mm}`;
    }

    // ==========================================================================
    // Storage & State Control
    // ==========================================================================
    const API_URL = '/api';
    let authToken = safeStorageGet('hijab_token') || '';

    function safeStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (err) {
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (err) {
            // storage blocked or unavailable
        }
    }

    function safeStorageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            // storage blocked or unavailable
        }
    }

    function authHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }
        return headers;
    }

    async function apiLogin(username, password) {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Invalid credentials');
        }

        return response.json();
    }

    async function fetchOrdersFromServer() {
        const response = await fetch(`${API_URL}/orders`, {
            headers: authHeaders()
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Unable to load orders');
        }
        return response.json();
    }

    async function createOrderOnServer(order) {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(order)
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Unable to create order');
        }
        return response.json();
    }

    async function updateOrderOnServer(order) {
        const response = await fetch(`${API_URL}/orders/${order.id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(order)
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Unable to update order');
        }
        return response.json();
    }

    async function deleteOrderOnServer(orderId) {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Unable to delete order');
        }
    }

    function setAuthToken(token) {
        authToken = token;
        if (token) {
            safeStorageSet('hijab_token', token);
        } else {
            safeStorageRemove('hijab_token');
        }
    }

    function loadState() {
        const storedCurrency = safeStorageGet('hijab_currency');
        if (storedCurrency) {
            currencySymbol = storedCurrency;
            currencySelect.value = storedCurrency;
        } else {
            currencySymbol = '₹';
            currencySelect.value = '₹';
        }
        updateFormCurrencySymbols();
        lucide.createIcons();
    }

    async function loadOrders() {
        try {
            orders = await fetchOrdersFromServer();
        } catch (error) {
            orders = [];
            if (error.message.toLowerCase().includes('unauthorized')) {
                setAuthToken('');
                showLoginScreen();
                return;
            }
            console.error(error);
            alert('Unable to load orders from server. Please try again.');
        }
        render();
    }

    function saveCurrency(curr) {
        currencySymbol = curr;
        safeStorageSet('hijab_currency', curr);
        updateFormCurrencySymbols();
        render();
    }

    function updateFormCurrencySymbols() {
        document.querySelectorAll('.input-currency-symbol').forEach(el => {
            el.textContent = currencySymbol;
        });
    }

    // ==========================================================================
    // Login / Security
    // ==========================================================================
    function showLoginScreen() {
        loginError.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        loginUsername.focus();
    }

    function unlockApp() {
        loginScreen.classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        render();
    }

    async function handleLogin(event) {
        event.preventDefault();
        const enteredUsername = loginUsername.value.trim();
        const enteredPassword = loginPassword.value;

        try {
            const result = await apiLogin(enteredUsername, enteredPassword);
            setAuthToken(result.token);
            loginForm.reset();
            await loadOrders();
            unlockApp();
        } catch (error) {
            loginError.classList.remove('hidden');
        }
    }

    async function checkLoginStatus() {
        if (!authToken) {
            showLoginScreen();
            return;
        }

        try {
            await loadOrders();
            unlockApp();
        } catch (error) {
            setAuthToken('');
            showLoginScreen();
        }
    }

    loginForm.addEventListener('submit', handleLogin);

    // ==========================================================================
    // Date Helpers
    // ==========================================================================
    function formatPrettyDate(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    function formatPrettyDateTime(dateTimeStr) {
        if (!dateTimeStr) return '—';
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return dateTimeStr;
        
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // Current datetime-local string
    function getCurrentDateTimeLocalString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // ==========================================================================
    // Calculations & Metrics Engine
    // ==========================================================================
    function calculateMetrics(filteredOrders) {
        // We calculate statistics based on active (non-cancelled) orders for business insights,
        // but we show general totals. Let's count revenue, cost and profit from all non-cancelled orders.
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        
        let deliveredCount = 0;
        let activeDeliveryBase = 0; // pending + shipped + delivered (excludes cancelled)

        orders.forEach(order => {
            const sell = parseFloat(order.sellingPrice) || 0;
            const buy = parseFloat(order.buyingPrice) || 0;
            const profit = sell - buy;

            if (order.status !== 'Cancelled') {
                totalRevenue += sell;
                totalCost += buy;
                totalProfit += profit;
                activeDeliveryBase++;
                
                if (order.status === 'Delivered') {
                    deliveredCount++;
                }
            }
        });

        // Profit margin calculation
        const marginPct = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
        
        // Delivery Success rate calculation
        const deliveryRate = activeDeliveryBase > 0 ? Math.round((deliveredCount / activeDeliveryBase) * 100) : 0;

        // Render dashboard values
        valRevenue.textContent = `${currencySymbol}${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        valCost.textContent = `${currencySymbol}${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        // Color code net profit
        valProfit.textContent = `${totalProfit >= 0 ? '' : '-'}${currencySymbol}${Math.abs(totalProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (totalProfit >= 0) {
            valProfit.parentElement.parentElement.classList.remove('kpi-danger-alert');
        } else {
            valProfit.parentElement.parentElement.classList.add('kpi-danger-alert');
        }

        valMargin.textContent = `${marginPct}%`;
        valDelivery.textContent = `${deliveryRate}%`;
    }

    // ==========================================================================
    // Render Functions
    // ==========================================================================
    function render() {
        const query = searchInput.value.toLowerCase().trim();
        const statusFilter = filterStatus.value;
        const sortValue = sortBy.value;

        // 1. Filter Orders
        let processedOrders = orders.filter(order => {
            const matchesQuery = 
                (order.productName || '').toLowerCase().includes(query) ||
                (order.customerName || '').toLowerCase().includes(query) ||
                (order.customerContact || '').toLowerCase().includes(query) ||
                (order.notes || '').toLowerCase().includes(query);
            
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            
            return matchesQuery && matchesStatus;
        });

        // 2. Sort Orders
        processedOrders.sort((a, b) => {
            if (sortValue === 'date-desc') {
                return new Date(b.orderDate) - new Date(a.orderDate);
            } else if (sortValue === 'date-asc') {
                return new Date(a.orderDate) - new Date(b.orderDate);
            } else if (sortValue === 'profit-desc') {
                const profitA = (parseFloat(a.sellingPrice) || 0) - (parseFloat(a.buyingPrice) || 0);
                const profitB = (parseFloat(b.sellingPrice) || 0) - (parseFloat(b.buyingPrice) || 0);
                return profitB - profitA;
            } else if (sortValue === 'revenue-desc') {
                return (parseFloat(b.sellingPrice) || 0) - (parseFloat(a.sellingPrice) || 0);
            } else if (sortValue === 'name-asc') {
                return (a.productName || '').localeCompare(b.productName || '');
            }
            return 0;
        });

        // 3. Render Table rows
        ordersTbody.innerHTML = '';
        if (processedOrders.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            processedOrders.forEach(order => {
                const tr = document.createElement('tr');
                
                const buy = parseFloat(order.buyingPrice) || 0;
                const sell = parseFloat(order.sellingPrice) || 0;
                const profit = sell - buy;
                const profitPct = buy > 0 ? Math.round((profit / buy) * 100) : 0;
                
                let badgeClass = 'badge-pending';
                if (order.status === 'Shipped') badgeClass = 'badge-shipped';
                if (order.status === 'Delivered') badgeClass = 'badge-delivered';
                if (order.status === 'Cancelled') badgeClass = 'badge-cancelled';

                // We inject dynamic content with safe sanitization
                tr.innerHTML = `
                    <td data-label="Order Details" class="span-full">
                        <div class="product-cell">
                            <span class="product-name-txt">${escapeHtml(order.productName)}</span>
                            <span class="product-notes-txt" title="${escapeHtml(order.notes || '')}">${escapeHtml(order.notes || 'No notes')}</span>
                        </div>
                    </td>
                    <td data-label="Customer Info">
                        <div class="customer-cell">
                            <span class="customer-name-txt">${escapeHtml(order.customerName || 'Walk-in')}</span>
                            <span class="customer-contact-txt">${escapeHtml(order.customerContact || '—')}</span>
                        </div>
                    </td>
                    <td data-label="Buying Cost">${currencySymbol}${buy.toFixed(2)}</td>
                    <td data-label="Selling Price">${currencySymbol}${sell.toFixed(2)}</td>
                    <td data-label="Calculated Profit">
                        <div class="profit-text ${profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                            ${profit >= 0 ? '+' : ''}${currencySymbol}${profit.toFixed(2)}
                            <div style="font-size: 0.7rem; font-weight: normal; color: var(--text-secondary);">
                                ${profit >= 0 ? '+' : ''}${profitPct}% markup
                            </div>
                        </div>
                    </td>
                    <td data-label="Status">
                        <span class="badge ${badgeClass}">${order.status}</span>
                    </td>
                    <td data-label="Order Date">${formatPrettyDate(order.orderDate)}</td>
                    <td data-label="Delivery Date">${formatPrettyDateTime(order.deliveryDate)}</td>
                    <td data-label="Actions" class="actions-cell">
                        ${order.status !== 'Delivered' && order.status !== 'Cancelled' ? `
                            <button class="btn-icon btn-status-toggle" data-id="${order.id}" title="Quick mark as Delivered">
                                <i data-lucide="check-circle"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-edit" data-id="${order.id}" title="Edit order">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${order.id}" title="Delete order">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
                ordersTbody.appendChild(tr);
            });
        }

        // Re-calculate the KPI Cards
        calculateMetrics(processedOrders);
        
        // Redraw analytical charts
        drawCharts();

        // Refresh icons
        lucide.createIcons();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // ==========================================================================
    // Modal Actions
    // ==========================================================================
    function openModal(orderToEdit = null) {
        orderForm.reset();
        
        if (orderToEdit) {
            modalTitle.textContent = 'Edit Order Details';
            orderIdInput.value = orderToEdit.id;
            document.getElementById('product-name').value = orderToEdit.productName;
            document.getElementById('customer-name').value = orderToEdit.customerName || '';
            document.getElementById('customer-contact').value = orderToEdit.customerContact || '';
            document.getElementById('buying-price').value = orderToEdit.buyingPrice;
            document.getElementById('selling-price').value = orderToEdit.sellingPrice;
            orderStatusInput.value = orderToEdit.status;
            document.getElementById('order-date').value = orderToEdit.orderDate;
            deliveryDateInput.value = orderToEdit.deliveryDate || '';
            document.getElementById('notes').value = orderToEdit.notes || '';
        } else {
            modalTitle.textContent = 'New Order Details';
            orderIdInput.value = '';
            // Pre-fill today's date
            document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
            deliveryDateInput.value = '';
            orderStatusInput.value = 'Pending';
        }
        
        toggleDeliveryDateField();
        orderModal.classList.remove('hidden');
        orderModal.classList.add('active');
    }

    function closeModal() {
        orderModal.classList.remove('active');
        orderModal.classList.add('hidden');
        orderForm.reset();
    }

    function toggleDeliveryDateField() {
        // If status is "Delivered", show delivery datetime selector
        if (orderStatusInput.value === 'Delivered') {
            deliveryDateGroup.style.display = 'flex';
            if (!deliveryDateInput.value) {
                // Autocomplete with current local timestamp
                deliveryDateInput.value = getCurrentDateTimeLocalString();
            }
        } else {
            // Hide and clear
            deliveryDateGroup.style.display = 'none';
            deliveryDateInput.value = '';
        }
    }

    // Handle status selector in form
    orderStatusInput.addEventListener('change', toggleDeliveryDateField);

    // Form submission
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = orderIdInput.value;
        const record = {
            id: id || 'order-' + Date.now(),
            productName: productNameInput.value.trim(),
            customerName: customerNameInput.value.trim(),
            customerContact: customerContactInput.value.trim(),
            buyingPrice: parseFloat(buyingPriceInput.value) || 0,
            sellingPrice: parseFloat(sellingPriceInput.value) || 0,
            status: orderStatusInput.value,
            orderDate: orderDateInput.value,
            deliveryDate: deliveryDateInput.value,
            notes: notesInput.value.trim()
        };

        console.log('[orderForm submit] record:', record);

        if (!record.productName) {
            alert('Product name is required. Please enter a product name.');
            productNameInput.focus();
            return;
        }

        try {
            if (id) {
                await updateOrderOnServer(record);
            } else {
                await createOrderOnServer(record);
            }
            await loadOrders();
            closeModal();
        } catch (error) {
            alert(error.message || 'Unable to save order.');
        }
    });

    // Quick Mark as Delivered Action
    ordersTbody.addEventListener('click', async (e) => {
        const toggleBtn = e.target.closest('.btn-status-toggle');
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');

        if (toggleBtn) {
            const id = toggleBtn.dataset.id;
            const order = orders.find(o => o.id === id);
            if (order) {
                order.status = 'Delivered';
                order.deliveryDate = getCurrentDateTimeLocalString();
                try {
                    await updateOrderOnServer(order);
                    await loadOrders();
                } catch (error) {
                    alert(error.message || 'Unable to update order status.');
                }
            }
        }

        if (editBtn) {
            const id = editBtn.dataset.id;
            const order = orders.find(o => o.id === id);
            if (order) {
                openModal(order);
            }
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            console.log('[ordersTbody click] deleteBtn clicked id=', id);
            if (confirm('Are you sure you want to delete this order?')) {
                try {
                    await deleteOrderOnServer(id);
                    await loadOrders();
                } catch (error) {
                    console.error('[deleteOrder] error:', error);
                    alert(error.message || 'Unable to delete order.');
                }
            }
        }
    });

    // Close on click outside container
    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            closeModal();
        }
    });

    // Bind event controls
    newOrderBtn.addEventListener('click', () => openModal(null));
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    
    // Bind filters changes
    searchInput.addEventListener('input', render);
    filterStatus.addEventListener('change', render);
    sortBy.addEventListener('change', render);
    
    // Currency Switcher
    currencySelect.addEventListener('change', (e) => {
        saveCurrency(e.target.value);
    });

    // ==========================================================================
    // CSV and JSON Importers / Exporters
    // ==========================================================================
    
    // 1. Export CSV
    exportBtn.addEventListener('click', () => {
        if (orders.length === 0) {
            alert('No orders to export.');
            return;
        }

        const csvHeaders = ['Order ID', 'Product Name', 'Customer Name', 'Customer Contact', 'Buying Cost', 'Selling Price', 'Profit', 'Status', 'Order Date', 'Delivery Date', 'Notes'];
        const csvRows = [csvHeaders.join(',')];

        orders.forEach(order => {
            const buy = parseFloat(order.buyingPrice) || 0;
            const sell = parseFloat(order.sellingPrice) || 0;
            const profit = sell - buy;
            
            const row = [
                order.id,
                `"${(order.productName || '').replace(/"/g, '""')}"`,
                `"${(order.customerName || '').replace(/"/g, '""')}"`,
                `"${(order.customerContact || '').replace(/"/g, '""')}"`,
                buy.toFixed(2),
                sell.toFixed(2),
                profit.toFixed(2),
                order.status,
                order.orderDate,
                order.deliveryDate || '',
                `"${(order.notes || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `hijab_billing_orders_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 2. Backup JSON State
    backupBtn.addEventListener('click', () => {
        const backupData = {
            version: '1.0',
            currency: currencySymbol,
            orders: orders,
            exportedAt: new Date().toISOString()
        };

        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", `hijab_billing_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
    });

    // 3. Trigger file click for imports
    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    // 4. Handle files upload (JSON or CSV)
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        
        // Import JSON backup
        if (file.name.endsWith('.json')) {
            reader.onload = async (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (parsed && Array.isArray(parsed.orders)) {
                        if (confirm(`Do you want to import ${parsed.orders.length} orders from this backup?`)) {
                            if (parsed.currency) {
                                currencySymbol = parsed.currency;
                                currencySelect.value = parsed.currency;
                                localStorage.setItem('hijab_currency', parsed.currency);
                            }
                            const importedOrders = parsed.orders.map(order => ({
                                id: order.id || 'order-' + Date.now(),
                                productName: order.productName || 'Imported Product',
                                customerName: order.customerName || '',
                                customerContact: order.customerContact || '',
                                buyingPrice: parseFloat(order.buyingPrice) || 0,
                                sellingPrice: parseFloat(order.sellingPrice) || 0,
                                status: order.status || 'Pending',
                                orderDate: order.orderDate || new Date().toISOString().split('T')[0],
                                deliveryDate: order.deliveryDate || '',
                                notes: order.notes || ''
                            }));

                            await Promise.all(importedOrders.map(createOrderOnServer));
                            await loadOrders();
                            alert('Backup imported successfully!');
                        }
                    } else {
                        alert('Invalid backup file format.');
                    }
                } catch (err) {
                    alert('Error reading JSON: ' + err.message);
                }
            };
            reader.readAsText(file);
        } 
        // Import CSV backup
        else if (file.name.endsWith('.csv')) {
            reader.onload = async (event) => {
                try {
                    const csvText = event.target.result;
                    const lines = csvText.split('\n');
                    if (lines.length <= 1) {
                        alert('CSV file is empty.');
                        return;
                    }

                    const importedOrders = [];
                    // Simple CSV row parser (handles values wrapped in quotes)
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const rowValues = [];
                        let insideQuote = false;
                        let currentValue = '';
                        
                        for (let j = 0; j < line.length; j++) {
                            const char = line[j];
                            if (char === '"') {
                                insideQuote = !insideQuote;
                            } else if (char === ',' && !insideQuote) {
                                rowValues.push(currentValue.trim());
                                currentValue = '';
                            } else {
                                currentValue += char;
                            }
                        }
                        rowValues.push(currentValue.trim());

                        // Map CSV column values back to fields
                        if (rowValues.length >= 8) {
                            const pName = rowValues[1].replace(/^"|"$/g, '').replace(/""/g, '"');
                            const cName = rowValues[2].replace(/^"|"$/g, '').replace(/""/g, '"');
                            const cContact = rowValues[3].replace(/^"|"$/g, '').replace(/""/g, '"');
                            const buyPrice = parseFloat(rowValues[4]) || 0;
                            const sellPrice = parseFloat(rowValues[5]) || 0;
                            const statusVal = rowValues[7];
                            const oDate = rowValues[8];
                            const dDate = rowValues[9] || '';
                            const notesVal = rowValues[10] ? rowValues[10].replace(/^"|"$/g, '').replace(/""/g, '"') : '';

                            importedOrders.push({
                                id: 'order-' + (Date.now() + i),
                                productName: pName || 'Imported Product',
                                customerName: cName,
                                customerContact: cContact,
                                buyingPrice: buyPrice,
                                sellingPrice: sellPrice,
                                status: ['Pending', 'Shipped', 'Delivered', 'Cancelled'].includes(statusVal) ? statusVal : 'Pending',
                                orderDate: oDate || new Date().toISOString().split('T')[0],
                                deliveryDate: dDate,
                                notes: notesVal
                            });
                        }
                    }

                    if (importedOrders.length > 0) {
                        if (confirm(`Do you want to append ${importedOrders.length} orders from the CSV file to your existing orders list?`)) {
                            await Promise.all(importedOrders.map(createOrderOnServer));
                            await loadOrders();
                            alert('CSV orders imported successfully!');
                        }
                    } else {
                        alert('Could not find any valid orders in CSV.');
                    }
                } catch (err) {
                    alert('Error parsing CSV: ' + err.message);
                }
            };
            reader.readAsText(file);
        } else {
            alert('Please select a valid JSON backup or CSV file.');
        }
        
        // Reset file element value so the same file can be uploaded again
        importFile.value = '';
    });

    // ==========================================================================
    // Analytics Charts Configuration (Chart.js)
    // ==========================================================================
    function drawCharts() {
        // Group orders by month
        const monthlyData = {};
        
        orders.forEach(order => {
            if (order.status === 'Cancelled') return; // Skip cancelled orders in financial chart
            
            const date = new Date(order.orderDate);
            if (isNaN(date.getTime())) return;
            
            // Format to "YYYY-MM" (e.g. "2026-05")
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const monthKey = `${year}-${month}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { revenue: 0, cost: 0, profit: 0 };
            }
            
            const buy = parseFloat(order.buyingPrice) || 0;
            const sell = parseFloat(order.sellingPrice) || 0;
            const profit = sell - buy;
            
            monthlyData[monthKey].revenue += sell;
            monthlyData[monthKey].cost += buy;
            monthlyData[monthKey].profit += profit;
        });

        // Get sorted list of last 6 months (or whatever months are present)
        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(key => {
            const [year, month] = key.split('-');
            const date = new Date(year, parseInt(month) - 1, 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });
        
        const revenues = sortedMonths.map(key => monthlyData[key].revenue);
        const costs = sortedMonths.map(key => monthlyData[key].cost);
        const profits = sortedMonths.map(key => monthlyData[key].profit);

        // Group status counts
        const statuses = { Pending: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
        orders.forEach(order => {
            if (statuses[order.status] !== undefined) {
                statuses[order.status]++;
            }
        });

        // 1. Destroy old financial chart if exists
        if (salesChart) {
            salesChart.destroy();
        }

        // Initialize/Render Sales Trend Chart
        const ctxSales = document.getElementById('salesChart').getContext('2d');
        salesChart = new Chart(ctxSales, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['No Data'],
                datasets: [
                    {
                        label: 'Total Revenue',
                        data: revenues.length > 0 ? revenues : [0],
                        backgroundColor: 'rgba(59, 130, 246, 0.65)',
                        borderColor: '#3b82f6',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        barPercentage: 0.6,
                    },
                    {
                        label: 'Net Profit',
                        data: profits.length > 0 ? profits : [0],
                        backgroundColor: 'rgba(16, 185, 129, 0.65)',
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        barPercentage: 0.6,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 11, weight: 500 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.raw !== null) {
                                    label += currencySymbol + context.raw.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 10 },
                            callback: function(value) { return currencySymbol + value; }
                        }
                    }
                }
            }
        });

        // 2. Destroy old delivery doughnut chart if exists
        if (deliveryChart) {
            deliveryChart.destroy();
        }

        // Initialize/Render Delivery doughnut chart
        const ctxDelivery = document.getElementById('deliveryChart').getContext('2d');
        
        // Colors corresponding to: Pending, Shipped, Delivered, Cancelled
        const statusColors = ['#f59e0b', '#6366f1', '#10b981', '#ef4444'];
        const statusHoverColors = ['#d97706', '#4f46e5', '#059669', '#dc2626'];
        
        const hasStatusData = Object.values(statuses).some(val => val > 0);

        deliveryChart = new Chart(ctxDelivery, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
                datasets: [{
                    data: hasStatusData ? [statuses.Pending, statuses.Shipped, statuses.Delivered, statuses.Cancelled] : [1, 0, 0, 0],
                    backgroundColor: hasStatusData ? statusColors : ['rgba(255,255,255,0.05)'],
                    hoverBackgroundColor: hasStatusData ? statusHoverColors : ['rgba(255,255,255,0.05)'],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 11 },
                            padding: 12
                        }
                    },
                    tooltip: {
                        enabled: hasStatusData,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${context.label}: ${context.raw} orders (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ==========================================================================
    // Run Application
    // ==========================================================================
    loadState();
    checkLoginStatus();
});
