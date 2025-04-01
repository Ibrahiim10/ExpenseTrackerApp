const categorySelect = document.getElementById('category-select');
const amountInput = document.getElementById('amount-input');
const dateInput = document.getElementById('date-input');
const addBtn = document.getElementById('add-btn');
const expensesTableBody = document.getElementById('expense-table-body');
const totalAmountCell = document.getElementById('total-amount');
const notification = document.getElementById('notification');

// API URL
const url = 'https://exchangerate-api.p.rapidapi.com/rapid/latest/USD';

// global configuration
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
let exchangeRates = {};
let baseCurrency = 'USD';

// Api request to get exchange rates using fetch 
async function fetchExchangeRates() {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': 'e3f9e2aebcmshf4f404802e791a2p1123eejsn540e54762670',
                'x-rapidapi-host': 'exchangerate-api.p.rapidapi.com'
            }
        });
        
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        
        const data = await response.json();
        if (!data.rates) throw new Error('Invalid API response - missing rates');
        
        exchangeRates = data.rates;
        baseCurrency = data.base || 'USD';
        
        const currencySelect = document.getElementById('currency-select');
        if (currencySelect) {
            currencySelect.disabled = false;
            currencySelect.dispatchEvent(new Event('change'));
        }
        
        return true;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        showUserMessage('Failed to load exchange rates. Using default currency.', 'error');
        return false;
    }
}

function initExpenseTracker() {
    renderExpenses();
    if (addBtn) addBtn.addEventListener('click', addExpense);
    
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.addEventListener('change', renderExpenses);
    }
}

function addExpense() {
    const category = categorySelect.value;
    const amount = Number(amountInput.value);
    const date = dateInput.value;
    const currency = document.getElementById('currency-select').value;

    const expense = { 
        id: Date.now(),
        category, 
        amount: convertCurrency(amount, currency, baseCurrency), 
        originalAmount: amount,
        originalCurrency: currency,
        date
    };

    expenses.push(expense);
    totalAmount += expense.amount;
    
    renderExpenses();
    saveToLocalStorage();
    
    // Clear input field
    amountInput.value = '';
}

function renderExpenses() {
    if (!expensesTableBody) return;
    
    expensesTableBody.innerHTML = '';
    const displayCurrency = document.getElementById('currency-select')?.value || 'USD';

    expenses.forEach(expense => {
        const row = document.createElement('tr');
        const convertedAmount = convertCurrency(
            expense.originalAmount, 
            expense.originalCurrency, 
            displayCurrency
        );
        
        row.innerHTML = `
            <td>${expense.category}</td>
            <td>${formatCurrency(convertedAmount, displayCurrency)}</td>
            <td>${formatDate(expense.date)}</td>
            <td><button class="delete-btn" data-id="${expense.id}">Delete</button></td>
        `;
        expensesTableBody.appendChild(row);
    });
    
    updateTotalDisplay();
}

function updateTotalDisplay() {
    if (!totalAmountCell) return;
    
    const displayCurrency = document.getElementById('currency-select')?.value || 'USD';
    const convertedTotal = convertCurrency(totalAmount, baseCurrency, displayCurrency);
    totalAmountCell.textContent = formatCurrency(convertedTotal, displayCurrency);
}

function initTransactionHistory() {
    renderTransactions();
    
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('export-btn')?.addEventListener('click', exportToCSV);
}

function renderTransactions(filteredExpenses = expenses) {
    const transactionsTableBody = document.getElementById('transactions-table-body');
    if (!transactionsTableBody) return;
    
    transactionsTableBody.innerHTML = '';
    let filteredTotal = 0;
    const displayCurrency = 'USD'; // Or get from user preference
    
    filteredExpenses.forEach(expense => {
        const convertedAmount = convertCurrency(
            expense.originalAmount,
            expense.originalCurrency,
            displayCurrency
        );
        filteredTotal += convertedAmount;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(expense.date)}</td>
            <td>${expense.category}</td>
            <td>${formatCurrency(convertedAmount, displayCurrency)}</td>
            <td>
                
                <button class="delete-btn" data-id="${expense.id}">Delete</button>
            </td>
        `;
        transactionsTableBody.appendChild(row);
    });
    
    document.getElementById('filtered-total').textContent = 
        formatCurrency(filteredTotal, displayCurrency);
}

function applyFilters() {
    const monthFilter = document.getElementById('month-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    
    let filtered = [...expenses];
    
    if (monthFilter !== 'all') {
        filtered = filtered.filter(expense => {
            const expenseMonth = expense.date.split('-')[1];
            return expenseMonth === monthFilter;
        });
    }
    
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(expense => expense.category === categoryFilter);
    }
    
    renderTransactions(filtered);
}

function initFinancialReports() {
    const categoryCtx = document.getElementById('category-chart')?.getContext('2d');
    const trendCtx = document.getElementById('monthly-trend-chart')?.getContext('2d');
    
    if (categoryCtx) {
        window.categoryChart = new Chart(categoryCtx, {
            type: 'pie',
            data: { labels: [], datasets: [{
                data: [],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]},
            options: { responsive: true }
        });
    }
    
    if (trendCtx) {
        window.trendChart = new Chart(trendCtx, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'Daily Expenses',
                data: [],
                borderColor: '#4CAF50',
                tension: 0.1
            }]},
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
    
    document.getElementById('generate-report')?.addEventListener('click', generateReport);
    generateReport();
}

function generateReport() {
    const month = document.getElementById('report-month')?.value || 'current';
    let filteredExpenses = [...expenses];
    
    if (month !== 'current') {
        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseMonth = expense.date.split('-')[1];
            return expenseMonth === month;
        });
    } else {
        const currentMonth = new Date().getMonth() + 1;
        const monthString = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
        filteredExpenses = filteredExpenses.filter(expense => {
            const expenseMonth = expense.date.split('-')[1];
            return expenseMonth === monthString;
        });
    }
    
    updateCategoryChart(filteredExpenses);
    updateTrendChart(filteredExpenses);
    updateSummary(filteredExpenses);
}

function updateCategoryChart(expenses) {
    if (!window.categoryChart) return;
    
    const categories = {};
    expenses.forEach(expense => {
        categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });
    
    window.categoryChart.data.labels = Object.keys(categories);
    window.categoryChart.data.datasets[0].data = Object.values(categories);
    window.categoryChart.update();
}

function updateTrendChart(expenses) {
    if (!window.trendChart) return;
    
    const dailyTotals = {};
    expenses.forEach(expense => {
        const date = expense.date.split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
    });
    
    const sortedDates = Object.keys(dailyTotals).sort();
    window.trendChart.data.labels = sortedDates.map(date => formatDate(date));
    window.trendChart.data.datasets[0].data = sortedDates.map(date => dailyTotals[date]);
    window.trendChart.update();
}

function updateSummary(expenses) {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const days = new Set(expenses.map(expense => expense.date.split('T')[0])).size;
    const averageDaily = days > 0 ? (total / days).toFixed(2) : 0;
    
    const categories = {};
    expenses.forEach(expense => {
        categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });
    
    let highestCategory = '-';
    let highestAmount = 0;
    for (const [category, amount] of Object.entries(categories)) {
        if (amount > highestAmount) {
            highestAmount = amount;
            highestCategory = category;
        }
    }
    
    if (document.getElementById('total-expenses')) {
        document.getElementById('total-expenses').textContent = formatCurrency(total, 'USD');
    }
    if (document.getElementById('highest-category')) {
        document.getElementById('highest-category').textContent = 
            `${highestCategory} (${formatCurrency(highestAmount, 'USD')})`;
    }
    if (document.getElementById('average-daily')) {
        document.getElementById('average-daily').textContent = formatCurrency(averageDaily, 'USD');
    }
}

function convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    return (amount / exchangeRates[fromCurrency]) * exchangeRates[toCurrency];
}

function formatCurrency(amount, currency) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : 
        date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        
    }
}

function deleteExpense(id) {
    const index = expenses.findIndex(expense => expense.id === id);
    if (index !== -1) {
        totalAmount -= expenses[index].amount;
        expenses.splice(index, 1);
        saveToLocalStorage();
        
        if (document.getElementById('expense-table-body')) {
            renderExpenses();
        }
        if (document.getElementById('transactions-table-body')) {
            renderTransactions();
        }
        if (document.getElementById('category-chart')) {
            generateReport();
        }
        
    }
}
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-btn')) {
        const id = parseInt(e.target.dataset.id);
        deleteExpense(id);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    if (dateInput) dateInput.valueAsDate = new Date();
    if (document.getElementById('expense-table-body')) {
        initExpenseTracker();
    } else if (document.getElementById('transactions-table-body')) {
        initTransactionHistory();
    } else if (document.getElementById('category-chart')) {
        initFinancialReports();
    }
});

document.addEventListener('DOMContentLoaded', function() {

    fetchExchangeRates().then(success => {
        console.log('API fetch result:', success);
        console.log('Exchange rates:', exchangeRates);
    });
});
