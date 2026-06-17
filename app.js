/**
 * L'Aura - Bar & Coctelería Minimalista
 * Google Sheets API Integration & Dynamic Rendering
 */

// --- CONFIGURATION ---
// Reemplaza este ID por el tuyo en producción.
// Este ID corresponde a la hoja de cálculo publicada provista por el usuario.
const DEFAULT_SPREADSHEET_ID = '2PACX-1vQPBbB2NcLAQVaa1IN6uEpJtZgAhQ9a6vFoTV-x5mt4C-9ZXBhUAt-_N9YPjT9AbIrLP-atxAIAxcvG'; 
let SPREADSHEET_ID = DEFAULT_SPREADSHEET_ID;

// --- STATE MANAGEMENT ---
let menuData = [];
let activeCategory = 'all';

// --- CONFIGURATION LINKS (FALLBACK & SHEET DB) ---
// Estos enlaces se usarán por defecto si no se encuentra la pestaña "Config" en el Google Sheet
let configLinks = {
  instagram_url: 'https://www.instagram.com/atlantida_cafe?igsh=aHo5MzlpZmI1aWFu',
  google_maps_url: 'https://www.google.com/maps/place/Atlantida+Cafe/@36.6995757,-4.4504108,17z/data=!3m1!4b1!4m6!3m5!1s0xd72f77d5d9271d5:0x5455e785796eca9a!8m2!3d36.6995714!4d-4.4478359!16s%2Fg%2F11ckr5k1b8',
  reviews_url: 'https://www.google.com/search?q=Atlantida+Cafe+Rese%C3%B1as#lkt=LocalPoiReviews'
};


// --- MOCK DATA (FALLBACK) ---
// Se muestra si la red falla o si no se ha configurado el ID del Sheet
const mockMenuData = [
  {
    id: 1,
    category: 'Cócteles',
    name: 'Margarita de Mezcal',
    description: 'Mezcal artesanal, licor de naranja, sirope de agave y zumo de lima fresco con sal de gusano en el borde.',
    price: 9.50,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 2,
    category: 'Cócteles',
    name: 'Smoked Penicillin',
    description: 'Whisky escocés blended, sirope artesanal de jengibre y miel de brezo, zumo de limón y flotador de whisky turbio de Islay.',
    price: 10.50,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 3,
    category: 'Comida',
    name: 'Tacos de Cochinita Pibil',
    description: 'Tres tortillas de maíz nixtamalizado, panceta de cerdo desmechada marinada en achiote, cebolla morada encurtida y cilantro fresco.',
    price: 9.00,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 4,
    category: 'Comida',
    name: 'Tabla de Quesos y Embutidos',
    description: 'Selección curada de quesos locales de oveja y cabra, cecina de león ahumada, almendras tostadas y pan de masa madre con tomate.',
    price: 14.50,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1631206756286-9a2df99540c4?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 5,
    category: 'Bebidas',
    name: 'IPA Local - Grifo',
    description: 'Cerveza artesanal de estilo India Pale Ale. Aromas cítricos intensos, lúpulos locales y amargor balanceado de 6.2% vol.',
    price: 4.80,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 6,
    category: 'Bebidas',
    name: 'Kombucha de Jengibre y Limón',
    description: 'Té fermentado de cultivo ecológico local, infusionado en frío con raíces de jengibre fresco y zumo de limón siciliano.',
    price: 4.20,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&q=80&w=600'
  }
];

// --- DOM ELEMENTS ---
const menuGrid = document.getElementById('menu-grid');
const categoryFilters = document.getElementById('category-filters');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');

// Debugger DOM Elements
const btnToggleDebugger = document.getElementById('btn-toggle-debugger');
const debuggerPanel = document.getElementById('debugger-panel');
const debuggerChevron = document.getElementById('debugger-chevron');
const connectionStatusDot = document.getElementById('connection-status-dot');
const connectionStatusText = document.getElementById('connection-status-text');
const debugSheetId = document.getElementById('debug-sheet-id');
const debugApiUrl = document.getElementById('debug-api-url');
const debugLastSync = document.getElementById('debug-last-sync');
const debugRowsCount = document.getElementById('debug-rows-count');

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkDebugMode();
  loadData();
  loadConfig(); // Inicia la carga de la configuración de enlaces
});

// --- EVENTS ---
function setupEventListeners() {
  // Toggle Collapsible Debugger
  btnToggleDebugger.addEventListener('click', () => {
    const isOpen = debuggerPanel.classList.toggle('open');
    debuggerChevron.classList.toggle('open', isOpen);
  });

  // Retry sync button
  btnRetry.addEventListener('click', () => {
    loadData();
  });
}

function checkDebugMode() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasDebugParam = new URLSearchParams(window.location.search).has('debug');
  const showDebugger = isLocal || hasDebugParam;
  
  const pipelineContainer = document.querySelector('.pipeline-badge-container');
  const dataCredit = document.querySelector('.data-credit');
  
  if (pipelineContainer) {
    pipelineContainer.style.display = showDebugger ? 'flex' : 'none';
  }
  if (dataCredit) {
    dataCredit.style.display = showDebugger ? 'block' : 'none';
  }
}

// --- DATA PIPELINE (API FETCH) ---
async function loadData() {
  showSkeletons();
  updateStatusIndicator('syncing', 'Sincronizando con Google Sheets...');
  errorContainer.classList.add('hidden');
  
  const isPublished = SPREADSHEET_ID.startsWith('2PACX');
  const apiUrl = isPublished 
    ? `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?output=csv&gid=1419609544`
    : `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
  
  // Update Debugger Details
  debugSheetId.textContent = SPREADSHEET_ID;
  debugApiUrl.href = apiUrl;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const textText = await response.text();
    let parsedData = null;
    
    if (isPublished) {
      parsedData = parseCSVMenu(textText);
    } else {
      parsedData = parseGoogleSheetsJSON(textText);
    }
    
    if (parsedData && parsedData.length > 0) {
      menuData = parsedData;
      updateStatusIndicator('online', 'Data Pipeline: Online (Google Sheets)');
    } else {
      throw new Error("No se obtuvieron registros o formato incorrecto.");
    }
  } catch (error) {
    console.warn("Fallo al conectar con Google Sheets API. Usando datos locales de demostración (Fallback). Motivo:", error.message);
    
    // Fallback to mock data for flawless user experience
    menuData = mockMenuData;
    updateStatusIndicator('offline', 'Data Pipeline: Fallback Local (Modo Demostración)');
    
    // Show user-friendly log
    debugSheetId.textContent = `${SPREADSHEET_ID.substring(0, 15)}... (Fallback local)`;
  } finally {
    // Refresh GUI
    renderCategories();
    renderMenu();
    updateDebuggerStats();
    lucide.createIcons(); // Redraw icons
  }
}

// --- CSV PARSING UTILITIES ---
function parseCSV(csvText) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i+1];
    
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

function parseCSVMenu(csvText) {
  try {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return null;
    
    // Normalizar encabezados
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    const productIdx = headers.findIndex(h => h === 'producto' || h === 'nombre' || h === 'name');
    const priceIdx = headers.findIndex(h => h === 'precio' || h === 'price');
    const categoryIdx = headers.findIndex(h => h === 'categoria' || h === 'category');
    const descIdx = headers.findIndex(h => h === 'descripcion' || h === 'description');
    const availableIdx = headers.findIndex(h => h === 'disponible' || h === 'available');
    const imageIdx = headers.findIndex(h => h === 'imagen_url' || h === 'image_url' || h === 'image' || h === 'imagen');
    
    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue; // Saltar filas vacías
      
      const name = productIdx !== -1 && row[productIdx] ? row[productIdx].trim() : '';
      const priceStr = priceIdx !== -1 && row[priceIdx] ? row[priceIdx].trim() : '0';
      const category = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx].trim() : 'Otros';
      const description = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '';
      const availableStr = availableIdx !== -1 && row[availableIdx] ? row[availableIdx].trim().toLowerCase() : 'true';
      const imageUrl = imageIdx !== -1 && row[imageIdx] ? row[imageIdx].trim() : '';
      
      if (!name) continue; // Ignorar si no tiene nombre
      
      // Parsear precio (soporta comas europeas: 1,40 -> 1.40)
      const sanitizedPrice = priceStr.replace(',', '.').replace(/[^\d.]/g, '');
      const price = parseFloat(sanitizedPrice) || 0;
      
      let available = true;
      if (availableStr === 'false' || availableStr === 'no' || availableStr === '0') {
        available = false;
      }
      
      if (available) {
        items.push({
          id: i,
          category: category,
          name: name,
          description: description,
          price: price,
          available: true,
          imageUrl: imageUrl
        });
      }
    }
    return items;
  } catch (err) {
    console.error("Error al parsear el menú CSV:", err);
    return null;
  }
}

/**
 * Google Visualization JSON response parser
 */
function parseGoogleSheetsJSON(rawText) {
  try {
    // Google Sheets API returns: google.visualization.Query.setResponse({ ... });
    const match = rawText.match(/google\.visualization\.Query\.setResponse\(([\s\S\w\W]*)\);/);
    if (!match || !match[1]) return null;
    
    const json = JSON.parse(match[1]);
    const table = json.table;
    if (!table || !table.cols || !table.rows) return null;
    
    // Map column labels/headers
    const headers = table.cols.map(col => col.label ? col.label.trim() : '');
    
    // Map rows to raw objects
    const rawRows = table.rows.map(row => {
      const obj = {};
      row.c.forEach((cell, idx) => {
        const header = headers[idx] || `col_${idx}`;
        obj[header] = cell ? cell.v : null;
      });
      return obj;
    });
    
    // Normalize and filter properties (Spanish/English support)
    return rawRows.map(row => {
      const normalized = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase().trim();
        const value = row[key];
        
        if (lowerKey === 'id') normalized.id = value;
        else if (lowerKey === 'categoria' || lowerKey === 'category') normalized.category = value;
        else if (lowerKey === 'nombre' || lowerKey === 'name') normalized.name = value;
        else if (lowerKey === 'descripcion' || lowerKey === 'description') normalized.description = value;
        else if (lowerKey === 'precio' || lowerKey === 'price') {
          // Parse float price securely
          const parsedPrice = parseFloat(value);
          normalized.price = isNaN(parsedPrice) ? value : parsedPrice;
        }
        else if (lowerKey === 'disponible' || lowerKey === 'available') {
          // Normalize boolean available
          if (value === 'TRUE' || value === true || value === 1 || value === 'true') {
            normalized.available = true;
          } else if (value === 'FALSE' || value === false || value === 0 || value === 'false') {
            normalized.available = false;
          } else {
            normalized.available = true; // Default to available
          }
        }
        else if (lowerKey === 'imagen_url' || lowerKey === 'image_url' || lowerKey === 'imagen' || lowerKey === 'image') {
          normalized.imageUrl = value;
        }
      }
      return normalized;
    }).filter(item => item.name && item.available !== false); // Hide unavailable items
    
  } catch (err) {
    console.error("Error al parsear el JSON de Google Sheets:", err);
    return null;
  }
}

// --- RENDER FUNCTIONS ---

function renderCategories() {
  // Extract unique categories
  const categories = ['all', ...new Set(menuData.map(item => item.category).filter(Boolean))];
  
  categoryFilters.innerHTML = '';
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${activeCategory === cat ? 'active' : ''}`;
    btn.textContent = cat === 'all' ? 'Todo' : cat;
    btn.setAttribute('data-category', cat);
    
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = cat;
      renderMenu();
    });
    
    categoryFilters.appendChild(btn);
  });
}

function renderMenu() {
  menuGrid.innerHTML = '';
  
  const filteredData = activeCategory === 'all' 
    ? menuData 
    : menuData.filter(item => item.category === activeCategory);
    
  if (filteredData.length === 0) {
    menuGrid.innerHTML = `
      <div class="error-container">
        <i data-lucide="coffee" class="error-icon" style="color: var(--primary)"></i>
        <h2>Carta no disponible</h2>
        <p>No hay platos disponibles en esta categoría en este momento.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }
  
  filteredData.forEach(item => {
    const card = document.createElement('article');
    card.className = 'menu-card';
    
    // Price formatter
    const formattedPrice = typeof item.price === 'number' 
      ? `${item.price.toFixed(2)}€` 
      : `${item.price}`;
      
    // Image structure
    let imageHTML = `
      <div class="card-image-placeholder">
        <i data-lucide="glass-water"></i>
      </div>
    `;
    
    if (item.imageUrl && item.imageUrl.trim() !== '') {
      imageHTML = `
        <img src="${item.imageUrl}" alt="${item.name}" class="card-image" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;card-image-placeholder&quot;><i data-lucide=&quot;image-off&quot;></i></div>'; lucide.createIcons();">
      `;
    }
    
    const descriptionHTML = item.description && item.description.trim() !== '' 
      ? `<p class="card-description">${item.description}</p>`
      : '';
      
    card.innerHTML = `
      <div class="card-image-container">
        ${imageHTML}
        <span class="card-badge">${item.category}</span>
      </div>
      <div class="card-body">
        <div class="card-header-row">
          <h2 class="card-title">${item.name}</h2>
          <span class="card-price">${formattedPrice}</span>
        </div>
        ${descriptionHTML}
      </div>
    `;
    
    menuGrid.appendChild(card);
  });
  
  lucide.createIcons();
}

function showSkeletons() {
  menuGrid.innerHTML = Array(3).fill(0).map(() => `
    <div class="menu-item-skeleton">
      <div class="skeleton-image"></div>
      <div class="skeleton-info">
        <div class="skeleton-title-row">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line price"></div>
        </div>
        <div class="skeleton-line desc"></div>
        <div class="skeleton-line desc short"></div>
      </div>
    </div>
  `).join('');
}

// --- UTILS & PIPELINE VISUALIZATIONS ---

function updateStatusIndicator(state, text) {
  connectionStatusDot.className = 'status-indicator';
  connectionStatusDot.classList.add(`status-${state}`);
  connectionStatusText.textContent = text;
}

function updateDebuggerStats() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  
  debugLastSync.textContent = timeString;
  debugRowsCount.textContent = menuData.length;
}

// --- CONFIG INGESTION (GOOGLE SHEETS SHEET2) ---
function parseCSVConfig(csvText) {
  try {
    const rows = parseCSV(csvText);
    if (rows.length < 2) return;
    
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const keyIdx = headers.findIndex(h => h === 'clave' || h === 'key');
    const valIdx = headers.findIndex(h => h === 'valor' || h === 'value');
    
    if (keyIdx === -1 || valIdx === -1) return;
    
    rows.slice(1).forEach(row => {
      if (row.length < 2) return;
      const key = row[keyIdx] ? row[keyIdx].trim().toLowerCase() : '';
      const val = row[valIdx] ? row[valIdx].trim() : '';
      if (key && val) {
        if (key === 'instagram_url' || key === 'instagram') configLinks.instagram_url = val;
        else if (key === 'google_maps_url' || key === 'maps' || key === 'location') configLinks.google_maps_url = val;
        else if (key === 'reviews_url' || key === 'reviews' || key === 'reseñas') configLinks.reviews_url = val;
      }
    });
    console.log("Configuración cargada desde CSV de Google Sheets:", configLinks);
  } catch (err) {
    console.error("Error al parsear el config CSV:", err);
  }
}

// --- CONFIG INGESTION (GOOGLE SHEETS SHEET2) ---
async function loadConfig() {
  const isPublished = SPREADSHEET_ID.startsWith('2PACX');
  const configUrl = isPublished
    ? `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?output=csv&gid=331338235`
    : `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Config`;
    
  try {
    const response = await fetch(configUrl);
    if (!response.ok) throw new Error("No config sheet");
    const text = await response.text();
    
    if (isPublished) {
      parseCSVConfig(text);
    } else {
      // Ingesta JSON tradicional (gviz)
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w\W]*)\);/);
      if (!match || !match[1]) return;
      
      const json = JSON.parse(match[1]);
      const table = json.table;
      if (!table || !table.rows) return;
      
      table.rows.forEach(r => {
        if (r.c && r.c[0] && r.c[1]) {
          const key = r.c[0].v ? r.c[0].v.toString().trim().toLowerCase() : '';
          const val = r.c[1].v ? r.c[1].v.toString().trim() : '';
          if (key && val) {
            if (key === 'instagram_url' || key === 'instagram') configLinks.instagram_url = val;
            else if (key === 'google_maps_url' || key === 'maps' || key === 'location') configLinks.google_maps_url = val;
            else if (key === 'reviews_url' || key === 'reviews' || key === 'reseñas') configLinks.reviews_url = val;
          }
        }
      });
      console.log("Configuración de enlaces cargada con éxito de Google Sheets:", configLinks);
    }
  } catch (e) {
    console.log("Pestaña 'Config' no disponible en Google Sheets o formato incorrecto. Utilizando enlaces por defecto en app.js.");
  } finally {
    updateActionButtons();
  }
}

function updateActionButtons() {
  const btnLocation = document.getElementById('btn-location');
  const btnReservations = document.getElementById('btn-reservations');
  const btnReviews = document.getElementById('btn-reviews');
  
  if (btnLocation && configLinks.google_maps_url) btnLocation.href = configLinks.google_maps_url;
  if (btnReservations && configLinks.instagram_url) btnReservations.href = configLinks.instagram_url;
  if (btnReviews && configLinks.reviews_url) btnReviews.href = configLinks.reviews_url;
}

