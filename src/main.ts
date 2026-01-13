import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  UrlHelper,
  CameraController,
  SelectionExtension,
  FilteringExtension,
} from "@speckle/viewer";

// Configuración y estado
let viewer: Viewer | null = null;
let cameraController: CameraController | null = null;
let selectionExtension: SelectionExtension | null = null;

// UI Helper functions
function showLoadingUI(message: string, progress: number = 0) {
  const container = document.getElementById("speckle");
  if (!container) return;

  const existingOverlay = document.getElementById("loading-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(36, 36, 36, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  overlay.innerHTML = `
    <div style="text-align: center; color: white; font-family: system-ui, sans-serif; width: 320px;">
      <div style="margin-bottom: 20px;">
        <div style="
          width: 64px;
          height: 64px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: #646cff;
          border-radius: 50%;
          margin: 0 auto;
          animation: spin 1s linear infinite;
        "></div>
      </div>
      <p style="font-weight: 500; margin-bottom: 12px; font-size: 16px;">${message}</p>
      <div style="
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      ">
        <div id="progress-bar" style="
          width: ${progress}%;
          height: 100%;
          background: #646cff;
          transition: width 0.3s ease;
        "></div>
      </div>
      <p style="font-size: 14px; color: rgba(255, 255, 255, 0.7);">${Math.round(progress)}%</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  container.appendChild(overlay);
}

function updateLoadingProgress(progress: number) {
  const progressBar = document.getElementById("progress-bar");
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

function hideLoadingUI() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";
    setTimeout(() => overlay.remove(), 300);
  }
}

function showError(message: string) {
  const container = document.getElementById("speckle");
  if (!container) return;

  hideLoadingUI();

  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    position: absolute;
    inset: 0;
    background: #242424;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  errorDiv.innerHTML = `
    <div style="
      text-align: center;
      color: white;
      font-family: system-ui, sans-serif;
      padding: 40px;
      max-width: 500px;
    ">
      <div style="
        width: 64px;
        height: 64px;
        background: rgba(239, 68, 68, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      ">
        <svg width="32" height="32" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">Unable to Load Model</h2>
      <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 24px;">${message}</p>
      <button onclick="location.reload()" style="
        padding: 10px 24px;
        background: #646cff;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      " onmouseover="this.style.background='#535bf2'" onmouseout="this.style.background='#646cff'">
        Retry
      </button>
    </div>
  `;

  container.appendChild(errorDiv);
}

// Info Panel functions
function openInfoPanel() {
  const panel = document.getElementById("info-panel");
  const mainContent = document.getElementById("main-content");
  
  if (panel) {
    panel.classList.remove("collapsed");
  }
  if (mainContent) {
    mainContent.classList.add("panel-open");
  }
}

function closeInfoPanel() {
  const panel = document.getElementById("info-panel");
  const mainContent = document.getElementById("main-content");
  
  if (panel) {
    panel.classList.add("collapsed");
  }
  if (mainContent) {
    mainContent.classList.remove("panel-open");
  }
  
  clearPanelData();
}

function clearPanelData() {
  const emptyState = document.getElementById("panel-empty-state");
  const dataContainer = document.getElementById("panel-data");
  
  if (emptyState) emptyState.style.display = "flex";
  if (dataContainer) {
    dataContainer.style.display = "none";
    dataContainer.innerHTML = "";
  }
}

async function displayObjectInfo(objectData: any) {
  const emptyState = document.getElementById("panel-empty-state");
  const dataContainer = document.getElementById("panel-data");
  
  if (!dataContainer) return;
  
  // Hide empty state
  if (emptyState) emptyState.style.display = "none";
  
  // Show data container
  dataContainer.style.display = "block";
  
  // Extract data
  const speckleData = objectData.data || objectData;
  
  // Build HTML
  let html = "";
  
  // ID específico para el cual obtener temperatura
  const TARGET_OBJECT_ID = "4f4ce1d871c54d72639a0dcbec246667";
  
  // Debug: mostrar todos los IDs posibles
  console.log("🔍 IDs encontrados en el objeto:");
  console.log("  - speckleData.id:", speckleData.id);
  console.log("  - objectData.id:", objectData.id);
  console.log("  - objectData.raw?.id:", objectData.raw?.id);
  console.log("  - objectData.model?.id:", objectData.model?.id);
  console.log("  - ID objetivo buscado:", TARGET_OBJECT_ID);
  
  // Verificar si es el objeto objetivo - buscar en múltiples lugares
  let temperature: number | null = null;
  let errorMessage: string | null = null;
  const objectId = speckleData.id || objectData.id || objectData.raw?.id || objectData.model?.id;
  const isTargetObject = objectId === TARGET_OBJECT_ID || 
                         String(objectId) === String(TARGET_OBJECT_ID) ||
                         speckleData.id === TARGET_OBJECT_ID;
  
  // TEMPORAL: Obtener temperatura para cualquier objeto para pruebas
  // TODO: Cambiar esto para que solo funcione con el objeto objetivo
  const shouldFetchTemperature = isTargetObject || true; // Cambiar a solo isTargetObject cuando funcione
  
  if (shouldFetchTemperature) {
    if (isTargetObject) {
      console.log("🎯 ✅ Objeto objetivo detectado! ID:", objectId);
    } else {
      console.log("🧪 Modo prueba: Obteniendo temperatura para cualquier objeto. ID:", objectId);
    }
    console.log("🌡️ Obteniendo temperatura...");
    
    try {
      // Usar siempre coordenadas de Almería, España
      const coords = { 
        latitude: 36.8381,   // Almería, España
        longitude: -2.4597    // Almería, España
      };
      console.log("📍 Usando coordenadas fijas de Almería:", coords);
      
      // Obtener temperatura actual y datos horarios para el gráfico
      const [tempResult, hourlyData] = await Promise.all([
        fetchTemperatureFromNASA(coords.latitude, coords.longitude),
        fetchHourlyTemperatureData(coords.latitude, coords.longitude)
      ]);
      
      temperature = tempResult;
      console.log("🌡️ Temperatura obtenida:", temperature);
      
      if (temperature === null) {
        errorMessage = "No se pudo extraer la temperatura de la respuesta de la API. Revisa la consola para más detalles.";
      }
      
      // Guardar datos horarios para el gráfico
      (window as any).temperatureHourlyData = hourlyData;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Error desconocido al obtener temperatura";
      console.error("❌ Error al obtener temperatura:", error);
    }
  } else {
    console.log("ℹ️ Este no es el objeto objetivo. ID actual:", objectId);
  }
  
  // Mostrar sección de temperatura si se obtuvo (o si es el objeto objetivo)
  if (temperature !== null && !isNaN(temperature)) {
    const isHigh = temperature > 25;
    const isLow = temperature < 15;
    
    html += `
      <div class="property-group" style="background: ${isHigh ? 'rgba(239, 68, 68, 0.1)' : isLow ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)'}; border-left: 4px solid ${isHigh ? '#ef4444' : isLow ? '#3b82f6' : '#22c55e'}; margin-bottom: 16px;">
        <div class="property-group-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12H18.75m-3.75 0H12m-3.75 0H8.25m-3.636 3.636l-1.591 1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m3.75 0H8.25m-3.636-3.636l-1.591-1.591M12 5.25V3m4.227 4.773l1.591-1.591M18.75 12H21m-3.75 0H15.75m3.636 3.636l1.591 1.591M12 18.75V21" />
          </svg>
          Temperature (NASA POWER)
        </div>
        <div class="property-item" style="padding: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 32px; font-weight: 600; color: ${isHigh ? '#ef4444' : isLow ? '#3b82f6' : '#22c55e'};">${temperature.toFixed(1)}</span>
            <span style="font-size: 18px; color: rgba(255, 255, 255, 0.7);">°C</span>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
            ${isHigh ? '⚠️ High temperature' : isLow ? 'ℹ️ Low temperature' : '✅ Normal temperature'}
          </div>
          <div style="margin-top: 4px; font-size: 11px; color: rgba(255, 255, 255, 0.5);">
            Source: NASA POWER API
          </div>
        </div>
      </div>
      
      <!-- Gráfico de temperatura últimas 24 horas -->
      <div class="property-group" style="margin-bottom: 16px;">
        <div class="property-group-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13l4-4 4 4M3 17l4-4 4 4m5-8l4-4 4 4m-4 4l4-4 4 4" />
          </svg>
          Temperature Trend (Last 24 Hours)
        </div>
        <div class="property-item" style="padding: 16px;">
          <div id="temperature-chart" style="width: 100%; min-height: 200px; display: flex; align-items: center; justify-content: center;">
            <div style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">Loading chart...</div>
          </div>
        </div>
      </div>
    `;
    
    // Renderizar gráfico después de insertar el HTML
    setTimeout(() => {
      const hourlyData = (window as any).temperatureHourlyData;
      if (hourlyData && hourlyData.length > 0) {
        renderTemperatureChart(hourlyData, "temperature-chart");
      } else {
        // Si no hay datos horarios, generar datos simulados basados en la temperatura actual
        // Esto proporciona una visualización útil aunque no sean datos reales
        if (temperature !== null && !isNaN(temperature)) {
          const simulatedData = generateSimulatedHourlyData(temperature);
          renderTemperatureChart(simulatedData, "temperature-chart");
          const chartContainer = document.getElementById("temperature-chart");
          if (chartContainer) {
            const note = document.createElement("div");
            note.style.cssText = "color: rgba(255, 255, 255, 0.4); font-size: 10px; text-align: center; margin-top: 8px; font-style: italic;";
            note.textContent = "* Simulated data based on current temperature";
            chartContainer.appendChild(note);
          }
        } else {
          const chartContainer = document.getElementById("temperature-chart");
          if (chartContainer) {
            chartContainer.innerHTML = '<div style="color: rgba(255, 255, 255, 0.5); font-size: 12px; text-align: center; padding: 20px;">No hourly data available<br/><span style="font-size: 10px; color: rgba(255,255,255,0.3);">Check console for details</span></div>';
          }
        }
      }
    }, 100);
  } else if (isTargetObject || shouldFetchTemperature) {
    // Mostrar mensaje si es el objeto objetivo pero no se pudo obtener la temperatura
    html += `
      <div class="property-group" style="background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; margin-bottom: 16px;">
        <div class="property-group-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Temperature (NASA POWER)
        </div>
        <div class="property-item" style="padding: 16px;">
          <div style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-bottom: 8px;">
            ⚠️ No se pudo obtener la temperatura.
          </div>
          ${errorMessage ? `
            <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin-top: 8px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px;">
              ${errorMessage}
            </div>
          ` : ''}
          <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 8px;">
            💡 Abre la consola del navegador (F12) para ver más detalles sobre el error.
          </div>
        </div>
      </div>
    `;
  }
  
  // Basic Information
  html += `
    <div class="property-group">
      <div class="property-group-title">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Basic Information
      </div>
  `;
  
  if (speckleData.id) {
    html += `
      <div class="property-item">
        <span class="property-label">ID</span>
        <span class="property-value">${truncateString(speckleData.id, 30)}</span>
      </div>
    `;
  }
  
  if (speckleData.speckle_type) {
    html += `
      <div class="property-item">
        <span class="property-label">Type</span>
        <span class="property-value">${speckleData.speckle_type}</span>
      </div>
    `;
  }
  
  if (speckleData.name) {
    html += `
      <div class="property-item">
        <span class="property-label">Name</span>
        <span class="property-value">${speckleData.name}</span>
      </div>
    `;
  }
  
  if (speckleData.category) {
    html += `
      <div class="property-item">
        <span class="property-label">Category</span>
        <span class="property-value">${speckleData.category}</span>
      </div>
    `;
  }
  
  if (speckleData.family) {
    html += `
      <div class="property-item">
        <span class="property-label">Family</span>
        <span class="property-value">${speckleData.family}</span>
      </div>
    `;
  }
  
  if (speckleData.level) {
    html += `
      <div class="property-item">
        <span class="property-label">Level</span>
        <span class="property-value">${typeof speckleData.level === 'object' ? speckleData.level.name || JSON.stringify(speckleData.level) : speckleData.level}</span>
      </div>
    `;
  }
  
  html += `</div>`;
  
  // Properties
  if (speckleData.properties && Object.keys(speckleData.properties).length > 0) {
    html += `
      <div class="property-group">
        <div class="property-group-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Properties
        </div>
    `;
    
    for (const [key, value] of Object.entries(speckleData.properties)) {
      const valueStr = formatValue(value);
      const isLong = valueStr.length > 50;
      
      html += `
        <div class="property-item">
          <span class="property-label">${key}</span>
          <span class="property-value ${isLong ? 'long' : ''}">${valueStr}</span>
        </div>
      `;
    }
    
    html += `</div>`;
  }
  
  // Parameters
  if (speckleData.parameters && Object.keys(speckleData.parameters).length > 0) {
    html += `
      <div class="property-group">
        <div class="property-group-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Parameters
        </div>
    `;
    
    for (const [key, value] of Object.entries(speckleData.parameters)) {
      const valueStr = formatValue(value);
      const isLong = valueStr.length > 50;
      
      html += `
        <div class="property-item">
          <span class="property-label">${key}</span>
          <span class="property-value ${isLong ? 'long' : ''}">${valueStr}</span>
        </div>
      `;
    }
    
    html += `</div>`;
  }
  
  // Raw Data (collapsible)
  html += `
    <div class="property-group">
      <div class="property-group-title">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Raw Data
      </div>
      <div class="property-item">
        <span class="property-value long">${JSON.stringify(speckleData, null, 2)}</span>
      </div>
    </div>
  `;
  
  dataContainer.innerHTML = html;
  openInfoPanel();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  
  if (typeof value === "object") {
    if (value.value !== undefined) {
      return String(value.value);
    }
    return JSON.stringify(value);
  }
  
  return String(value);
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

// Función para obtener temperatura de NASA POWER API
async function fetchTemperatureFromNASA(latitude: number, longitude: number): Promise<number | null> {
  try {
    // Obtener rango de fechas: últimos 7 días para encontrar el valor más reciente
    // NASA POWER generalmente tiene datos hasta hace 1-2 días
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Ayer (último día con datos probablemente disponibles)
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 días atrás desde ayer
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    const startStrISO = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endStrISO = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    
    // Construir URL de la API de NASA POWER con rango de fechas
    // T2M = Temperatura a 2 metros sobre la superficie
    // community=SB = Sustainable Buildings (puede ser necesario)
    const apiUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=SB&latitude=${latitude}&longitude=${longitude}&start=${startStr}&end=${endStr}&format=JSON`;
    
    console.log("🌡️ Obteniendo temperatura de NASA POWER");
    console.log("📍 Coordenadas:", latitude, longitude);
    console.log("📅 Rango de fechas:", `${startStrISO} a ${endStrISO}`, `(${startStr} a ${endStr})`);
    console.log("🔗 URL:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log("📡 Status de respuesta:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error en respuesta HTTP:", errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    
    console.log("📊 Respuesta completa de NASA POWER:", JSON.stringify(data, null, 2));
    
    // Obtener el fill_value (valor que indica "sin datos")
    const fillValue = data.header?.fill_value || -999;
    console.log("🔍 Fill value (sin datos):", fillValue);
    
    // La estructura de respuesta de NASA POWER puede variar:
    // Opción 1: data.properties.parameter.T2M["YYYYMMDD"] = temperatura en Celsius
    // Opción 2: data.properties.parameter.T2M.values[] = temperatura en Kelvin
    // Opción 3: data.properties.parameter.T2M = array o objeto
    let tempCelsius: number | null = null;
    let tempKelvin: number | null = null;
    
    // ESTRUCTURA 1: data.parameters.T2M - Información sobre el parámetro (no los valores)
    // Esta estructura solo contiene metadata (units, longname), no los valores reales
    // Los valores están en properties.parameter.T2M
    if (data.parameters && data.parameters.T2M) {
      const t2m = data.parameters.T2M;
      console.log("🔍 T2M encontrado en parameters (metadata):", t2m);
      // Esta estructura solo tiene información sobre el parámetro, no los valores
      // Los valores reales están en properties.parameter.T2M
    }
    
    // ESTRUCTURA 2: data.properties.parameter.T2M - La estructura más común
    // Formato: { "YYYYMMDD": temperatura_en_celsius }
    if (!tempCelsius && data.properties && data.properties.parameter && data.properties.parameter.T2M) {
      const t2m = data.properties.parameter.T2M;
      console.log("🔍 T2M encontrado en properties.parameter:", t2m);
      
      // Si es un objeto con la fecha como clave (estructura más común)
      if (typeof t2m === 'object' && !Array.isArray(t2m)) {
        // SIEMPRE buscar el valor más reciente válido de todo el rango
        // Filtrar entradas válidas (que no sean fill_value y tengan formato de fecha YYYYMMDD)
        const validEntries = Object.entries(t2m).filter(([key, value]) => {
          const numValue = parseFloat(String(value));
          // Verificar que sea un número válido, no sea fill_value, y la clave sea una fecha válida (8 dígitos)
          return !isNaN(numValue) && 
                 numValue !== fillValue && 
                 typeof key === 'string' && 
                 key.length === 8 &&
                 /^\d{8}$/.test(key); // Asegurar que es formato YYYYMMDD
        });
        
        if (validEntries.length > 0) {
          // Ordenar por fecha (más reciente primero) - las fechas en formato YYYYMMDD se ordenan correctamente con localeCompare
          const sortedEntries = validEntries.sort(([dateA], [dateB]) => {
            // Comparar fechas: más reciente primero
            return dateB.localeCompare(dateA);
          });
          
          // Tomar el valor más reciente
          const [mostRecentDate, mostRecentValue] = sortedEntries[0];
          tempCelsius = parseFloat(String(mostRecentValue));
          
          // Convertir fecha YYYYMMDD a formato legible
          const dateReadable = `${mostRecentDate.substring(0,4)}-${mostRecentDate.substring(4,6)}-${mostRecentDate.substring(6,8)}`;
          console.log("✅ Temperatura más reciente encontrada:", tempCelsius, "°C para fecha:", dateReadable, `(${mostRecentDate})`);
          console.log(`📊 Total de valores válidos encontrados: ${validEntries.length} de ${Object.keys(t2m).length} fechas`);
        } else {
          console.warn("⚠️ No se encontraron valores válidos (todos son fill_value o inválidos)");
        }
      }
      // Si es un array de valores (menos común)
      else if (Array.isArray(t2m) && t2m.length > 0) {
        const firstValue = parseFloat(t2m[0]);
        if (!isNaN(firstValue) && firstValue !== fillValue) {
          // Si el valor está en rango de Celsius, usar directamente; si no, asumir Kelvin
          if (firstValue > -50 && firstValue < 60) {
            tempCelsius = firstValue;
            console.log("✅ Temperatura encontrada en properties.parameter.T2M[0] (Celsius):", tempCelsius);
          } else if (firstValue > 200 && firstValue < 350) {
            tempKelvin = firstValue;
            console.log("✅ Temperatura encontrada en properties.parameter.T2M[0] (Kelvin):", tempKelvin);
          }
        }
      }
      // Si es un número directo
      else if (typeof t2m === 'number') {
        if (t2m !== fillValue) {
          if (t2m > -50 && t2m < 60) {
            tempCelsius = t2m;
            console.log("✅ Temperatura encontrada en properties.parameter.T2M (número directo, Celsius):", tempCelsius);
          } else if (t2m > 200 && t2m < 350) {
            tempKelvin = t2m;
            console.log("✅ Temperatura encontrada en properties.parameter.T2M (número directo, Kelvin):", tempKelvin);
          }
        }
      }
    }
    
    // ESTRUCTURA 3: data.parameter.T2M (sin properties)
    if (!tempCelsius && !tempKelvin && data.parameter && data.parameter.T2M) {
      const t2m = data.parameter.T2M;
      console.log("🔍 T2M encontrado en parameter:", t2m);
      
      if (t2m.values && Array.isArray(t2m.values) && t2m.values.length > 0) {
        tempKelvin = parseFloat(t2m.values[0]);
        console.log("✅ Temperatura encontrada en parameter.T2M.values[0] (Kelvin):", tempKelvin);
      } else if (Array.isArray(t2m) && t2m.length > 0) {
        tempKelvin = parseFloat(t2m[0]);
        console.log("✅ Temperatura encontrada en parameter.T2M[0] (Kelvin):", tempKelvin);
      } else if (typeof t2m === 'number') {
        // Si es un número, asumimos que puede ser Celsius o Kelvin
        // Si está en rango de Kelvin (200-350), convertir; si no, asumir Celsius
        if (t2m > 200 && t2m < 350) {
          tempKelvin = t2m;
          console.log("✅ Temperatura encontrada en parameter.T2M (número, asumido Kelvin):", tempKelvin);
        } else {
          tempCelsius = t2m;
          console.log("✅ Temperatura encontrada en parameter.T2M (número, asumido Celsius):", tempCelsius);
        }
      }
    }
    
    // Buscar recursivamente en toda la estructura si no encontramos nada
    if (!tempCelsius && !tempKelvin) {
      function findTemperature(obj: any, depth = 0): { celsius: number | null, kelvin: number | null } {
        if (depth > 5) return { celsius: null, kelvin: null }; // Limitar profundidad
        
        if (typeof obj === 'number') {
          // Rechazar fill_value
          if (obj === fillValue) return { celsius: null, kelvin: null };
          
          if (obj > 200 && obj < 350) {
            // Rango razonable para temperatura en Kelvin
            return { celsius: null, kelvin: obj };
          } else if (obj > -50 && obj < 60) {
            // Rango razonable para temperatura en Celsius
            return { celsius: obj, kelvin: null };
          }
        }
        
        if (Array.isArray(obj) && obj.length > 0) {
          const first = obj[0];
          if (typeof first === 'number') {
            if (first > 200 && first < 350) {
              return { celsius: null, kelvin: first };
            } else if (first > -50 && first < 60) {
              return { celsius: first, kelvin: null };
            }
          }
        }
        
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (key.toLowerCase().includes('t2m') || key.toLowerCase().includes('temp')) {
              const result = findTemperature(obj[key], depth + 1);
              if (result.celsius || result.kelvin) return result;
            }
          }
          // Buscar en todos los valores
          for (const value of Object.values(obj)) {
            const result = findTemperature(value, depth + 1);
            if (result.celsius || result.kelvin) return result;
          }
        }
        
        return { celsius: null, kelvin: null };
      }
      
      const found = findTemperature(data);
      if (found.celsius) {
        tempCelsius = found.celsius;
        console.log("✅ Temperatura encontrada mediante búsqueda recursiva (Celsius):", tempCelsius);
      } else if (found.kelvin) {
        tempKelvin = found.kelvin;
        console.log("✅ Temperatura encontrada mediante búsqueda recursiva (Kelvin):", tempKelvin);
      }
    }
    
    // Convertir y retornar la temperatura en Celsius
    // Verificar que no sea el fill_value antes de retornar
    if (tempCelsius !== null && !isNaN(tempCelsius) && tempCelsius !== fillValue) {
      console.log("✅ Temperatura final obtenida (ya en Celsius):", tempCelsius.toFixed(2), "°C");
      return tempCelsius;
    } else if (tempKelvin !== null && !isNaN(tempKelvin) && tempKelvin > 0 && tempKelvin !== fillValue) {
      // La temperatura viene en Kelvin, convertir a Celsius
      const finalTempCelsius = tempKelvin - 273.15;
      console.log("✅ Temperatura final obtenida:", finalTempCelsius.toFixed(2), "°C (de", tempKelvin.toFixed(2), "K)");
      return finalTempCelsius;
    }
    
    // Si llegamos aquí y tenemos un valor pero es fill_value, informar
    if ((tempCelsius === fillValue || tempKelvin === fillValue)) {
      console.warn("⚠️ La temperatura encontrada es fill_value (-999), no hay datos disponibles para esta fecha");
    }
    
    console.warn("⚠️ No se encontró temperatura en la respuesta de NASA POWER");
    console.warn("📋 Estructura de datos recibida:", Object.keys(data));
    if (data.properties) console.warn("📋 Properties keys:", Object.keys(data.properties));
    if (data.properties?.parameter) console.warn("📋 Parameter keys:", Object.keys(data.properties.parameter));
    if (data.parameters) console.warn("📋 Parameters keys:", Object.keys(data.parameters));
    if (data.parameter) console.warn("📋 Parameter keys:", Object.keys(data.parameter));
    return null;
  } catch (error) {
    console.error("❌ Error al obtener temperatura de NASA POWER:", error);
    return null;
  }
}

// Función para obtener datos horarios de temperatura de las últimas 24 horas
async function fetchHourlyTemperatureData(latitude: number, longitude: number): Promise<Array<{ time: string; temperature: number }> | null> {
  try {
    // Obtener fecha de ayer y hoy para las últimas 24 horas
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Ayer
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1); // Hace 2 días (para asegurar 24 horas de datos)
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    
    // Construir URL para datos horarios
    const apiUrl = `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M&community=SB&latitude=${latitude}&longitude=${longitude}&start=${startStr}&end=${endStr}&format=JSON`;
    
    console.log("📊 Obteniendo datos horarios de temperatura:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn("⚠️ No se pudieron obtener datos horarios, status:", response.status);
      return null;
    }
    
    const data = await response.json();
    console.log("📊 Respuesta completa de datos horarios:", JSON.stringify(data, null, 2));
    
    const fillValue = data.header?.fill_value || -999;
    console.log("🔍 Fill value para datos horarios:", fillValue);
    
    // Extraer datos horarios
    const hourlyData: Array<{ time: string; temperature: number }> = [];
    
    // Intentar múltiples estructuras posibles
    let t2m: any = null;
    
    // Estructura 1: data.properties.parameter.T2M
    if (data.properties && data.properties.parameter && data.properties.parameter.T2M) {
      t2m = data.properties.parameter.T2M;
      console.log("🔍 T2M encontrado en properties.parameter:", typeof t2m, Array.isArray(t2m) ? `array[${t2m.length}]` : Object.keys(t2m).length, "keys");
    }
    // Estructura 2: data.parameter.T2M
    else if (data.parameter && data.parameter.T2M) {
      t2m = data.parameter.T2M;
      console.log("🔍 T2M encontrado en parameter:", typeof t2m);
    }
    
    if (t2m) {
      // La estructura puede ser un objeto con fechas/horas como claves
      // Formato: { "YYYYMMDDHH": temperatura } o { "YYYYMMDDHHMM": temperatura }
      if (typeof t2m === 'object' && !Array.isArray(t2m)) {
        console.log("📋 Claves encontradas en T2M (primeras 5):", Object.keys(t2m).slice(0, 5));
        
        Object.entries(t2m).forEach(([key, value]) => {
          const temp = parseFloat(String(value));
          if (!isNaN(temp) && temp !== fillValue && temp > -50 && temp < 60) {
            // Aceptar cualquier formato de fecha/hora numérico (8, 10, 12 dígitos)
            if (/^\d{8,12}$/.test(key)) {
              hourlyData.push({
                time: key,
                temperature: temp
              });
            }
          }
        });
        
        console.log(`📊 Total de entradas válidas encontradas: ${hourlyData.length}`);
        
        if (hourlyData.length > 0) {
          // Ordenar por tiempo (más reciente primero) y tomar las últimas 24 horas
          hourlyData.sort((a, b) => b.time.localeCompare(a.time));
          const last24Hours = hourlyData.slice(0, 24).reverse(); // Invertir para mostrar cronológicamente
          
          console.log(`✅ Obtenidos ${last24Hours.length} puntos de datos horarios de ${hourlyData.length} totales`);
          return last24Hours;
        }
      }
      // Si es un array de valores
      else if (Array.isArray(t2m) && t2m.length > 0) {
        console.log("📋 T2M es un array con", t2m.length, "elementos");
        
        // Buscar tiempos en diferentes lugares
        let times: any[] = [];
        if (data.times && Array.isArray(data.times)) {
          times = data.times;
        } else if (data.times?.data && Array.isArray(data.times.data)) {
          times = data.times.data;
        } else if (data.header?.dates && Array.isArray(data.header.dates)) {
          times = data.header.dates;
        }
        
        t2m.forEach((temp: any, index: number) => {
          const tempValue = parseFloat(String(temp));
          if (!isNaN(tempValue) && tempValue !== fillValue && tempValue > -50 && tempValue < 60) {
            // Generar timestamp si no hay tiempos disponibles
            const timeStr = times[index] || (() => {
              const date = new Date();
              date.setHours(date.getHours() - (t2m.length - index - 1));
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hour = String(date.getHours()).padStart(2, '0');
              return `${year}${month}${day}${hour}`;
            })();
            
            hourlyData.push({
              time: String(timeStr),
              temperature: tempValue
            });
          }
        });
        
        if (hourlyData.length > 0) {
          const last24Hours = hourlyData.slice(-24); // Últimas 24 horas
          console.log(`✅ Obtenidos ${last24Hours.length} puntos de datos horarios (formato array)`);
          return last24Hours;
        }
      }
    }
    
    console.warn("⚠️ No se encontraron datos horarios en la respuesta");
    console.warn("📋 Estructura de datos:", Object.keys(data));
    if (data.properties) console.warn("📋 Properties keys:", Object.keys(data.properties));
    if (data.properties?.parameter) console.warn("📋 Parameter keys:", Object.keys(data.properties.parameter));
    
    // Si no hay datos horarios, generar datos simulados basados en la temperatura actual
    // Esto es un fallback para mostrar algo útil
    return null;
  } catch (error) {
    console.error("❌ Error al obtener datos horarios:", error);
    return null;
  }
}

// Función para generar datos horarios simulados basados en la temperatura actual
function generateSimulatedHourlyData(currentTemp: number): Array<{ time: string; temperature: number }> {
  const data: Array<{ time: string; temperature: number }> = [];
  const now = new Date();
  
  // Generar 24 puntos de datos (últimas 24 horas)
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(date.getHours() - i);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const timeStr = `${year}${month}${day}${hour}`;
    
    // Simular variación de temperatura (más frío por la noche, más cálido durante el día)
    const hourOfDay = date.getHours();
    let variation = 0;
    
    // Patrón diurno: más cálido entre 12-16h, más frío entre 2-6h
    if (hourOfDay >= 12 && hourOfDay <= 16) {
      variation = 2 + Math.random() * 2; // +2 a +4°C
    } else if (hourOfDay >= 2 && hourOfDay <= 6) {
      variation = -3 - Math.random() * 2; // -3 a -5°C
    } else {
      variation = -1 + Math.random() * 2; // -1 a +1°C
    }
    
    const simulatedTemp = currentTemp + variation + (Math.random() - 0.5) * 1.5; // Variación aleatoria pequeña
    
    data.push({
      time: timeStr,
      temperature: Math.round(simulatedTemp * 10) / 10 // Redondear a 1 decimal
    });
  }
  
  return data;
}

// Función para renderizar gráfico de temperatura
function renderTemperatureChart(data: Array<{ time: string; temperature: number }>, containerId: string) {
  if (!data || data.length === 0) {
    console.warn("⚠️ No hay datos para el gráfico");
    return;
  }
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Encontrar min y max de temperatura
  const temps = data.map(d => d.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1; // Evitar división por cero
  
  // Escalar valores
  const scaleX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const scaleY = (temp: number) => padding.top + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;
  
  // Crear SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.cssText = "background: rgba(0, 0, 0, 0.2); border-radius: 8px;";
  
  // Crear path para la línea
  let pathData = "";
  data.forEach((point, index) => {
    const x = scaleX(index);
    const y = scaleY(point.temperature);
    if (index === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  });
  
  // Área bajo la curva (gradiente)
  const areaPath = pathData + ` L ${scaleX(data.length - 1)} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
  
  // Definir gradiente
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.setAttribute("id", "tempGradient");
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "0%");
  gradient.setAttribute("y2", "100%");
  
  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#646cff");
  stop1.setAttribute("stop-opacity", "0.3");
  
  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#646cff");
  stop2.setAttribute("stop-opacity", "0");
  
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  
  // Área bajo la curva
  const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
  area.setAttribute("d", areaPath);
  area.setAttribute("fill", "url(#tempGradient)");
  svg.appendChild(area);
  
  // Línea de temperatura
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", pathData);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#646cff");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-linejoin", "round");
  svg.appendChild(line);
  
  // Puntos de datos
  data.forEach((point, index) => {
    const x = scaleX(index);
    const y = scaleY(point.temperature);
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", "#646cff");
    circle.setAttribute("stroke", "#fff");
    circle.setAttribute("stroke-width", "1.5");
    svg.appendChild(circle);
  });
  
  // Ejes y etiquetas
  // Eje Y (temperatura)
  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", String(padding.left));
  yAxis.setAttribute("y1", String(padding.top));
  yAxis.setAttribute("x2", String(padding.left));
  yAxis.setAttribute("y2", String(height - padding.bottom));
  yAxis.setAttribute("stroke", "rgba(255, 255, 255, 0.3)");
  yAxis.setAttribute("stroke-width", "1");
  svg.appendChild(yAxis);
  
  // Etiquetas Y
  const yLabels = [minTemp, (minTemp + maxTemp) / 2, maxTemp];
  yLabels.forEach((label, index) => {
    const y = scaleY(label);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(padding.left - 10));
    text.setAttribute("y", String(y + 4));
    text.setAttribute("fill", "rgba(255, 255, 255, 0.6)");
    text.setAttribute("font-size", "10");
    text.setAttribute("text-anchor", "end");
    text.textContent = `${label.toFixed(0)}°`;
    svg.appendChild(text);
  });
  
  // Eje X (tiempo)
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", String(padding.left));
  xAxis.setAttribute("y1", String(height - padding.bottom));
  xAxis.setAttribute("x2", String(width - padding.right));
  xAxis.setAttribute("y2", String(height - padding.bottom));
  xAxis.setAttribute("stroke", "rgba(255, 255, 255, 0.3)");
  xAxis.setAttribute("stroke-width", "1");
  svg.appendChild(xAxis);
  
  // Etiquetas X (mostrar solo algunas para no saturar)
  const step = Math.max(1, Math.floor(data.length / 6));
  data.forEach((point, index) => {
    if (index % step === 0 || index === data.length - 1) {
      const x = scaleX(index);
      let timeStr = "";
      
      // Formatear tiempo según el formato de la clave
      if (point.time.length >= 10 && /^\d{10,}$/.test(point.time)) {
        // Formato YYYYMMDDHH
        const hour = point.time.substring(8, 10);
        timeStr = `${hour}:00`;
      } else if (point.time.length >= 8 && /^\d{8}$/.test(point.time)) {
        // Formato YYYYMMDD - mostrar día y hora si es posible
        const day = point.time.substring(6, 8);
        timeStr = `Día ${day}`;
      } else {
        timeStr = point.time;
      }
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(height - padding.bottom + 20));
      text.setAttribute("fill", "rgba(255, 255, 255, 0.6)");
      text.setAttribute("font-size", "9");
      text.setAttribute("text-anchor", "middle");
      text.textContent = timeStr;
      svg.appendChild(text);
    }
  });
  
  container.innerHTML = "";
  container.appendChild(svg);
}

// Función para extraer coordenadas del objeto
function extractCoordinates(speckleData: any): { latitude: number; longitude: number } | null {
  // Buscar coordenadas en diferentes lugares posibles
  const coordKeys = ['latitude', 'lat', 'Latitude', 'LAT', 'longitude', 'lon', 'lng', 'Longitude', 'LONGITUDE'];
  
  let lat: number | null = null;
  let lon: number | null = null;
  
  // Buscar en properties
  if (speckleData.properties) {
    for (const key of coordKeys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('lat') && !lat) {
        const value = speckleData.properties[key];
        if (typeof value === 'number') lat = value;
        else if (typeof value === 'object' && value.value) lat = parseFloat(value.value);
      }
      if ((lowerKey.includes('lon') || lowerKey.includes('lng')) && !lon) {
        const value = speckleData.properties[key];
        if (typeof value === 'number') lon = value;
        else if (typeof value === 'object' && value.value) lon = parseFloat(value.value);
      }
    }
  }
  
  // Buscar en parameters
  if ((!lat || !lon) && speckleData.parameters) {
    for (const key of coordKeys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('lat') && !lat) {
        const value = speckleData.parameters[key];
        if (typeof value === 'number') lat = value;
        else if (typeof value === 'object' && value.value) lat = parseFloat(value.value);
      }
      if ((lowerKey.includes('lon') || lowerKey.includes('lng')) && !lon) {
        const value = speckleData.parameters[key];
        if (typeof value === 'number') lon = value;
        else if (typeof value === 'object' && value.value) lon = parseFloat(value.value);
      }
    }
  }
  
  // Si no se encuentran coordenadas, usar coordenadas por defecto de Almería, España
  if (!lat || !lon) {
    console.log("⚠️ No se encontraron coordenadas en el objeto, usando coordenadas por defecto de Almería");
    // Coordenadas por defecto: Almería, España
    return { latitude: 36.8381, longitude: -2.4597 };
  }
  
  return { latitude: lat, longitude: lon };
}

// Main viewer initialization
async function main() {
  try {
    console.log("🚀 Iniciando Speckle Viewer...");

    /** Get the HTML container */
    const container = document.getElementById("speckle");

    if (!container) {
      console.error("❌ No se encontró el contenedor #speckle");
      return;
    }

    console.log("✅ Contenedor encontrado");
    showLoadingUI("Initializing viewer...", 5);

    /** Configure the viewer params */
    const params = DefaultViewerParams;
    params.showStats = true;
    params.verbose = true;

    /** Create Viewer instance */
    viewer = new Viewer(container, params);
    console.log("✅ Viewer creado");
    updateLoadingProgress(10);

    /** Initialize the viewer */
    await viewer.init();
    console.log("✅ Viewer inicializado");
    updateLoadingProgress(20);
    showLoadingUI("Setting up extensions...", 20);

    /** Add extensions */
    viewer.createExtension(CameraController);
    cameraController = viewer.getExtension(CameraController) as CameraController;
    console.log("✅ CameraController añadido");

    viewer.createExtension(SelectionExtension);
    selectionExtension = viewer.getExtension(SelectionExtension) as SelectionExtension;
    selectionExtension.enabled = true;
    
    // Configurar color de selección
    selectionExtension.options.selectionMaterialData.color = 0x646cff;
    selectionExtension.options.selectionMaterialData.opacity = 0.8;
    console.log("✅ SelectionExtension añadido");

    viewer.createExtension(FilteringExtension);
    console.log("✅ FilteringExtension añadido");

    updateLoadingProgress(30);
    showLoadingUI("Fetching model data...", 30);

    /** Get model URL */
    const modelURL = "https://app.speckle.systems/projects/990e4aac58/models/cc5c4f0410";
    console.log("🔄 Obteniendo URLs del modelo...");

    const urls = await UrlHelper.getResourceUrls(modelURL);
    console.log("✅ URLs obtenidas:", urls);

    if (urls.length === 0) {
      throw new Error("No se encontraron URLs. Verifica que el proyecto sea público.");
    }

    updateLoadingProgress(40);

    /** Load each URL with progress tracking */
    const urlCount = urls.length;
    let urlsLoaded = 0;

    for (const url of urls) {
      console.log(`🔄 Cargando URL ${urlsLoaded + 1}/${urlCount}:`, url);
      showLoadingUI(`Loading model parts (${urlsLoaded + 1}/${urlCount})...`, 40 + (urlsLoaded * 50 / urlCount));

      const loader = new SpeckleLoader(viewer.getWorldTree(), url, "");

      // Track loading progress
      loader.on("load-progress", (progress: any) => {
        const baseProgress = 40 + (urlsLoaded * 50 / urlCount);
        const urlProgress = (progress.progress || 0) * (50 / urlCount);
        const totalProgress = Math.min(90, baseProgress + urlProgress);
        updateLoadingProgress(totalProgress);
      });

      await viewer.loadObject(loader, true);
      urlsLoaded++;
      console.log(`✅ URL ${urlsLoaded}/${urlCount} cargada`);
    }

    console.log("✅ Todos los objetos cargados");
    updateLoadingProgress(95);
    showLoadingUI("Finalizing...", 95);

    /** Setup selection handler */
    viewer.on("object-clicked", async () => {
      const selectedNodes = selectionExtension?.getSelectedNodes();

      if (selectedNodes && selectedNodes.length > 0) {
        const selectedObjects = selectionExtension?.getSelectedObjects();
        const elementData = selectedObjects?.[0] || selectedNodes[0];

        console.log("🎯 ===== OBJETO CLICKEADO =====");
        console.log("📦 Datos completos:", elementData);

        // Display in panel (ahora es async)
        await displayObjectInfo(elementData);

        // Log to console
        const speckleData = elementData.data || elementData;

        if (speckleData) {
          console.log("🔑 ID:", speckleData.id);
          console.log("📝 Tipo:", speckleData.speckle_type);

          if (speckleData.name) {
            console.log("🏷️ Nombre:", speckleData.name);
          }

          if (speckleData.properties) {
            console.log("⚙️ Propiedades:", speckleData.properties);
          }

          if (speckleData.parameters) {
            console.log("📊 Parámetros:", speckleData.parameters);
          }

          if (speckleData.category) {
            console.log("📁 Categoría:", speckleData.category);
          }

          if (speckleData.family) {
            console.log("👨‍👩‍👧‍👦 Familia:", speckleData.family);
          }

          if (speckleData.level) {
            console.log("📏 Nivel:", speckleData.level);
          }
        }

        console.log("================================\n");
      } else {
        closeInfoPanel();
      }
    });

    /** Zoom to extents */
    setTimeout(() => {
      if (cameraController) {
        cameraController.zoomExtents(0.95, true);
        console.log("✅ Cámara ajustada");
      }
    }, 500);

    updateLoadingProgress(100);
    setTimeout(() => {
      hideLoadingUI();
      console.log("🎉 ¡Speckle Viewer cargado exitosamente!");
      console.log("👆 Haz click en cualquier objeto para ver su información");
    }, 200);

    // Setup close panel button
    const closeBtn = document.getElementById("close-panel");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeInfoPanel);
    }

    // Setup sidebar menu items
    const menuItems = document.querySelectorAll(".menu-item[data-panel]");
    menuItems.forEach(item => {
      item.addEventListener("click", () => {
        // Remove active from all items
        menuItems.forEach(mi => mi.classList.remove("active"));
        // Add active to clicked item
        item.classList.add("active");
      });
    });

  } catch (error) {
    console.error("❌ Error al cargar el viewer:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    showError(error instanceof Error ? error.message : "Error desconocido al cargar el modelo");
  }
}

// Cleanup function
function cleanup() {
  if (viewer) {
    viewer.dispose();
    viewer = null;
  }
  cameraController = null;
  selectionExtension = null;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);