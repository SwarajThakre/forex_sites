// DOM Elements
const currentDateElement = document.getElementById('current-date');
const loadingElement = document.querySelector('.loading');
const errorElement = document.querySelector('.error-message');
const contentElement = document.querySelector('.content');

// Global variables
let exchangeRates = {};
let currencies = {};
let baseCurrency = 'EUR';

// Initialize the app based on the current page
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('currency-table')) {
    initIndexPage();
  } else if (document.getElementById('from-currency')) {
    initConverterPage();
  }
});

// Initialize index page
function initIndexPage() {
  const searchInput = document.getElementById('search-input');
  const refreshBtn = document.getElementById('refresh-btn');

  fetchExchangeRates();

  searchInput.addEventListener('input', filterCurrencyTable);
  refreshBtn.addEventListener('click', fetchExchangeRates);
}

// Initialize converter page
function initConverterPage() {
  const amountInput = document.getElementById('amount');
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');
  const convertBtn = document.getElementById('convert-btn');
  const swapBtn = document.getElementById('swap-currencies');

  // Fetch data and populate selects
  fetchExchangeRates().then(() => {
    populateCurrencySelects(fromCurrencySelect, toCurrencySelect);
  });

  amountInput.addEventListener('input', performConversion);
  fromCurrencySelect.addEventListener('change', performConversion);
  toCurrencySelect.addEventListener('change', performConversion);
  convertBtn.addEventListener('click', performConversion);
  swapBtn.addEventListener('click', swapCurrencies);
}

async function fetchExchangeRates() {
  showLoading();
  hideError();

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.info || 'Failed to fetch exchange rates');
    }

    // Store original rates with EUR as base
    const originalRates = data.rates;
    const inrRate = originalRates['INR'];
    const usdRate = originalRates['USD'];

    exchangeRates = {};
    for (const [currency, rate] of Object.entries(originalRates)) {
      exchangeRates[currency] = inrRate / rate;
    }

    exchangeRates['EUR'] = inrRate;
    exchangeRates['INR'] = 1;

    baseCurrency = 'INR';
    console.log('1 USD =', exchangeRates['USD'], 'INR');

    // Update UI
    const date = new Date(data.timestamp * 1000);
    currentDateElement.textContent = date.toLocaleString();

    if (document.getElementById('currency-table')) {
      updateCurrencyTable();
    }

    if (Object.keys(currencies).length === 0) {
      await fetchCurrencyNames();
      if (document.getElementById('currency-table')) {
        updateCurrencyTable();
      }
    }

    showContent();
  } catch (error) {
    showError(error.message);
  }
}
// Fetch currency full names
async function fetchCurrencyNames() {
  try {
    const response = await fetch(
      'https://openexchangerates.org/api/currencies.json'
    );
    currencies = await response.json();
  } catch (error) {
    console.error('Failed to fetch currency names:', error);
  }
}
function updateCurrencyTable() {
  const tableBody = document.getElementById('currency-table');
  tableBody.innerHTML = '';

  const ratesArray = Object.entries(exchangeRates)
    .map(([code, rate]) => ({
      code,
      rate,
      name: currencies[code] || code,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  ratesArray.forEach((currency) => {
    const row = document.createElement('tr');

    const codeCell = document.createElement('td');
    codeCell.textContent = currency.code;
    row.appendChild(codeCell);

    const nameCell = document.createElement('td');
    nameCell.textContent = currency.name;
    row.appendChild(nameCell);

    const rateCell = document.createElement('td');
    rateCell.textContent = `1 ${currency.code} = ${currency.rate.toFixed(
      6
    )} INR`;
    row.appendChild(rateCell);

    tableBody.appendChild(row);
  });
}
// Filter currency table based on search input
function filterCurrencyTable() {
  const searchInput = document.getElementById('search-input');
  const searchTerm = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll('#currency-table tr');

  rows.forEach((row) => {
    const code = row.cells[0].textContent.toLowerCase();
    const name = row.cells[1].textContent.toLowerCase();

    if (code.includes(searchTerm) || name.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Populate currency selects on converter page
function populateCurrencySelects(fromSelect, toSelect) {
  // Clear existing options
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';

  // Add options sorted by currency code
  const sortedCodes = Object.keys(exchangeRates).sort();

  sortedCodes.forEach((code) => {
    const option1 = document.createElement('option');
    option1.value = code;
    option1.textContent = `${code} - ${currencies[code] || code}`;
    fromSelect.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = code;
    option2.textContent = `${code} - ${currencies[code] || code}`;
    toSelect.appendChild(option2);
  });

  fromSelect.value = 'INR';
  toSelect.value = 'USD';

  performConversion();
}

// Perform currency conversion
function performConversion() {
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const fromCurrency = document.getElementById('from-currency').value;
  const toCurrency = document.getElementById('to-currency').value;
  const resultElement = document.getElementById('result');
  const rateInfoElement = document.getElementById('rate-info');

  if (!fromCurrency || !toCurrency) return;

  const fromRate = exchangeRates[fromCurrency];
  const toRate = exchangeRates[toCurrency];

  if (!fromRate || !toRate) {
    resultElement.textContent = 'Error: Invalid currency selection';
    return;
  }

  // Calculate how many toCurrency = amount fromCurrency
  const convertedAmount = (amount * fromRate) / toRate;
  const exchangeRate = fromRate / toRate;

  // Display result
  resultElement.innerHTML = `
      <strong>${amount.toFixed(2)} ${fromCurrency}</strong> = 
      <strong class="result-amount">${convertedAmount.toFixed(
        2
      )} ${toCurrency}</strong>
    `;

  // Display exchange rate info in correct format
  rateInfoElement.textContent = `1 ${fromCurrency} = ${exchangeRate.toFixed(
    6
  )} ${toCurrency}`;
}

// Swap currencies in converter
function swapCurrencies() {
  const fromSelect = document.getElementById('from-currency');
  const toSelect = document.getElementById('to-currency');

  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;

  performConversion();
}

// UI Helper functions
function showLoading() {
  loadingElement.style.display = 'flex';
  contentElement.style.display = 'none';
  errorElement.style.display = 'none';
}

function showContent() {
  loadingElement.style.display = 'none';
  contentElement.style.display = 'block';
  errorElement.style.display = 'none';
}

function showError(message) {
  loadingElement.style.display = 'none';
  contentElement.style.display = 'none';
  errorElement.style.display = 'block';
  errorElement.textContent = `Error: ${message}`;
}

function hideError() {
  errorElement.style.display = 'none';
}
