# 📚 Explicación del Código: Obtención de Temperatura desde NASA POWER API

## 🎯 Flujo Completo del Proceso

```
Usuario hace CLICK en objeto 3D
         ↓
[1] Event Handler detecta el click
         ↓
[2] Extrae datos del objeto seleccionado
         ↓
[3] Verifica si es el objeto objetivo (por ID)
         ↓
[4] Extrae coordenadas (latitud/longitud)
         ↓
[5] Construye URL de la API de NASA POWER
         ↓
[6] Hace petición HTTP a la API
         ↓
[7] Procesa la respuesta JSON
         ↓
[8] Busca la temperatura en la estructura
         ↓
[9] Convierte de Kelvin a Celsius
         ↓
[10] Muestra en el panel de información
```

---

## 🔍 PARTE 1: Detección del Click (Líneas ~750-770)

```typescript
viewer.on("object-clicked", async () => {
  const selectedNodes = selectionExtension?.getSelectedNodes();
  
  if (selectedNodes && selectedNodes.length > 0) {
    const selectedObjects = selectionExtension?.getSelectedObjects();
    const elementData = selectedObjects?.[0] || selectedNodes[0];
    
    // Llamar a la función que muestra la información
    await displayObjectInfo(elementData);
  }
});
```

**¿Qué hace?**
- **`viewer.on("object-clicked")`**: Escucha cuando el usuario hace click en un objeto 3D
- **`getSelectedNodes()`**: Obtiene los nodos seleccionados del modelo
- **`getSelectedObjects()`**: Obtiene los objetos completos con sus datos
- **`elementData`**: Contiene TODA la información del objeto clickeado

**Estructura de `elementData`:**
```javascript
{
  data: {
    id: "4f4ce1d871c54d72639a0dcbec246667",
    speckle_type: "Revit.Wall",
    properties: { ... },
    parameters: { ... }
  },
  raw: { ... },
  model: { ... }
}
```

---

## 🔍 PARTE 2: Función Principal `displayObjectInfo` (Líneas 193-438)

Esta es la función **orquestadora** que coordina todo el proceso.

### 2.1 Extracción de Datos (Líneas 205-206)

```typescript
const speckleData = objectData.data || objectData;
```

**¿Qué hace?**
- Intenta obtener `objectData.data` (estructura estándar de Speckle)
- Si no existe, usa `objectData` directamente
- Esto maneja diferentes formatos de datos

### 2.2 Verificación del ID Objetivo (Líneas 211-232)

```typescript
const TARGET_OBJECT_ID = "4f4ce1d871c54d72639a0dcbec246667";

const objectId = speckleData.id || objectData.id || objectData.raw?.id || objectData.model?.id;
const isTargetObject = objectId === TARGET_OBJECT_ID || 
                       String(objectId) === String(TARGET_OBJECT_ID) ||
                       speckleData.id === TARGET_OBJECT_ID;
```

**¿Qué hace?**
- Busca el ID en múltiples lugares posibles (porque Speckle puede guardarlo en diferentes sitios)
- Compara con el ID objetivo
- **`?.`** es el "optional chaining": solo accede si existe, evita errores

**Por qué buscar en varios lugares:**
```javascript
// El ID puede estar en:
speckleData.id              // ✅ Más común
objectData.id               // ✅ Alternativa
objectData.raw?.id          // ✅ Datos sin procesar
objectData.model?.id         // ✅ ID del modelo
```

### 2.3 Obtención de Coordenadas (Líneas 243-255)

```typescript
const coords = extractCoordinates(speckleData);
if (coords) {
  temperature = await fetchTemperatureFromNASA(coords.latitude, coords.longitude);
}
```

**¿Qué hace?**
- Llama a `extractCoordinates()` para obtener latitud y longitud
- Si encuentra coordenadas, llama a la API
- **`await`**: Espera a que la función termine (es asíncrona)

---

## 🔍 PARTE 3: Extracción de Coordenadas (Líneas 612-665)

```typescript
function extractCoordinates(speckleData: any): { latitude: number; longitude: number } | null {
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
      // ... similar para longitude
    }
  }
  
  // Si no encuentra, usa coordenadas por defecto
  if (!lat || !lon) {
    return { latitude: 40.4168, longitude: -3.7038 }; // Madrid, España
  }
  
  return { latitude: lat, longitude: lon };
}
```

**¿Qué hace?**
1. **Busca en `properties`**: Revisa todas las propiedades del objeto
2. **Busca en `parameters`**: Si no encuentra en properties, busca en parameters
3. **Múltiples nombres**: Busca "latitude", "lat", "Latitude", etc. (diferentes formatos)
4. **Coordenadas por defecto**: Si no encuentra nada, usa Madrid como fallback

**Estructura típica que busca:**
```javascript
// Opción 1: Números directos
properties: {
  latitude: 40.4168,
  longitude: -3.7038
}

// Opción 2: Objetos con valor
properties: {
  latitude: { value: 40.4168 },
  longitude: { value: -3.7038 }
}

// Opción 3: Nombres alternativos
properties: {
  lat: 40.4168,
  lon: -3.7038
}
```

---

## 🔍 PARTE 4: Llamada a la API de NASA POWER (Líneas 478-611)

### 4.1 Construcción de la URL (Líneas 481-487)

```typescript
const today = new Date();
const dateStr = today.toISOString().split('T')[0]; // "2025-01-15"

const apiUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&latitude=${latitude}&longitude=${longitude}&start=${dateStr}&end=${dateStr}&format=JSON`;
```

**¿Qué hace?**
- **`new Date()`**: Obtiene la fecha actual
- **`toISOString().split('T')[0]`**: Convierte a formato "YYYY-MM-DD"
- **Construye la URL** con:
  - `parameters=T2M`: Temperatura a 2 metros
  - `latitude` y `longitude`: Coordenadas
  - `start` y `end`: Mismo día (solo queremos un día)
  - `format=JSON`: Queremos respuesta en JSON

**Ejemplo de URL resultante:**
```
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&latitude=40.4168&longitude=-3.7038&start=2025-01-15&end=2025-01-15&format=JSON
```

### 4.2 Petición HTTP (Líneas 494-507)

```typescript
const response = await fetch(apiUrl, {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
  },
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
```

**¿Qué hace?**
- **`fetch()`**: Hace una petición HTTP GET a la API
- **`await`**: Espera la respuesta del servidor
- **`response.ok`**: Verifica que la respuesta sea exitosa (status 200-299)
- **`response.json()`**: Convierte la respuesta de texto a objeto JavaScript

**Posibles respuestas:**
```javascript
// ✅ Éxito (status 200)
{
  properties: {
    parameter: {
      T2M: { values: [285.5, 286.2, ...] }
    }
  }
}

// ❌ Error (status 400, 500, etc.)
{
  error: "Invalid parameters"
}
```

### 4.3 Extracción de la Temperatura (Líneas 515-594)

Esta es la parte **más compleja** porque la API puede devolver la temperatura en diferentes estructuras.

#### Estructura Esperada (Línea 518-541)

```typescript
if (data.properties && data.properties.parameter && data.properties.parameter.T2M) {
  const t2m = data.properties.parameter.T2M;
  
  // Opción 1: Objeto con array values
  if (t2m.values && Array.isArray(t2m.values) && t2m.values.length > 0) {
    tempKelvin = parseFloat(t2m.values[0]);
  }
  // Opción 2: Array directo
  else if (Array.isArray(t2m) && t2m.length > 0) {
    tempKelvin = parseFloat(t2m[0]);
  }
  // Opción 3: Número directo
  else if (typeof t2m === 'number') {
    tempKelvin = t2m;
  }
}
```

**Estructuras posibles que maneja:**

```javascript
// Estructura 1: Objeto con values
{
  properties: {
    parameter: {
      T2M: {
        values: [285.5, 286.2, 287.1]  // ← Toma el primero
      }
    }
  }
}

// Estructura 2: Array directo
{
  properties: {
    parameter: {
      T2M: [285.5, 286.2, 287.1]  // ← Toma el primero
    }
  }
}

// Estructura 3: Número directo
{
  properties: {
    parameter: {
      T2M: 285.5  // ← Usa directamente
    }
  }
}
```

#### Búsqueda Recursiva (Líneas 557-594)

Si no encuentra la temperatura en las estructuras esperadas, hace una búsqueda recursiva:

```typescript
function findTemperature(obj: any, depth = 0): number | null {
  if (depth > 5) return null; // Evitar bucle infinito
  
  // Si encuentra un número entre 200-350 (rango razonable de Kelvin)
  if (typeof obj === 'number' && obj > 200 && obj < 350) {
    return obj;
  }
  
  // Si es un array, busca en el primer elemento
  if (Array.isArray(obj) && obj.length > 0) {
    const first = obj[0];
    if (typeof first === 'number' && first > 200 && first < 350) {
      return first;
    }
  }
  
  // Si es un objeto, busca recursivamente en sus propiedades
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (key.toLowerCase().includes('t2m') || key.toLowerCase().includes('temp')) {
        const result = findTemperature(obj[key], depth + 1);
        if (result) return result;
      }
    }
  }
  
  return null;
}
```

**¿Por qué búsqueda recursiva?**
- La API puede cambiar su estructura
- Es un "plan B" si la estructura esperada no funciona
- Busca cualquier número que parezca una temperatura en Kelvin (200-350K)

### 4.4 Conversión a Celsius (Líneas 596-600)

```typescript
if (tempKelvin !== null && !isNaN(tempKelvin) && tempKelvin > 0) {
  const tempCelsius = tempKelvin - 273.15;
  return tempCelsius;
}
```

**¿Qué hace?**
- **NASA POWER devuelve en Kelvin**: 0K = -273.15°C
- **Fórmula de conversión**: °C = K - 273.15
- **Ejemplo**: 285.5K = 285.5 - 273.15 = 12.35°C

---

## 🔍 PARTE 5: Visualización en el Panel (Líneas 264-312)

### 5.1 Si se Obtuvo la Temperatura (Líneas 265-290)

```typescript
if (temperature !== null && !isNaN(temperature)) {
  const isHigh = temperature > 25;
  const isLow = temperature < 15;
  
  html += `
    <div class="property-group" style="background: ...">
      <div class="property-group-title">Temperature (NASA POWER)</div>
      <div class="property-item">
        <span style="font-size: 32px;">${temperature.toFixed(1)}</span>
        <span>°C</span>
      </div>
    </div>
  `;
}
```

**¿Qué hace?**
- **Verifica que la temperatura sea válida**: `!isNaN(temperature)`
- **Determina el color**: Alta (>25°C), Baja (<15°C), Normal
- **Genera HTML**: Crea el código HTML para mostrar la temperatura
- **`toFixed(1)`**: Muestra 1 decimal (ej: 12.3°C)

### 5.2 Si NO se Obtuvo la Temperatura (Líneas 291-312)

```typescript
else if (isTargetObject || shouldFetchTemperature) {
  html += `
    <div class="property-group" style="background: rgba(251, 191, 36, 0.1);">
      <div>⚠️ No se pudo obtener la temperatura.</div>
      ${errorMessage ? `<div>${errorMessage}</div>` : ''}
    </div>
  `;
}
```

**¿Qué hace?**
- Muestra un mensaje de error
- Incluye el mensaje específico si existe
- Usa color amarillo para indicar advertencia

---

## 🎓 Conceptos Clave Explicados

### 1. **Async/Await**
```typescript
async function fetchTemperature() {
  const response = await fetch(url);  // Espera la respuesta
  const data = await response.json(); // Espera la conversión
  return data;
}
```
- **`async`**: Marca la función como asíncrona (puede tomar tiempo)
- **`await`**: Espera a que termine la operación antes de continuar

### 2. **Optional Chaining (`?.`)**
```typescript
const id = objectData.raw?.id;
```
- Si `objectData.raw` es `null` o `undefined`, retorna `undefined` en lugar de error
- Equivale a: `objectData.raw && objectData.raw.id`

### 3. **Template Strings (Backticks)**
```typescript
const url = `https://api.com?lat=${latitude}&lon=${longitude}`;
```
- Permite insertar variables con `${variable}`
- Más legible que concatenar strings

### 4. **Type Guards**
```typescript
if (typeof value === 'number') {
  // TypeScript sabe que value es number aquí
}
```
- Verifica el tipo antes de usar
- Evita errores en tiempo de ejecución

---

## 🐛 Debugging: ¿Por qué no funciona?

### Posibles Problemas:

1. **El ID no coincide**
   - ✅ **Solución**: Revisa la consola, busca "🔍 IDs encontrados"
   - El ID real puede estar en otro lugar

2. **No hay coordenadas**
   - ✅ **Solución**: Se usan coordenadas por defecto (Madrid)
   - Verifica en consola: "📍 Coordenadas extraídas"

3. **La API no responde**
   - ✅ **Solución**: Revisa "📡 Status de respuesta"
   - Puede ser problema de CORS o la API está caída

4. **Estructura de respuesta diferente**
   - ✅ **Solución**: Revisa "📊 Respuesta completa de NASA POWER"
   - El código busca en múltiples lugares, pero puede necesitar ajuste

5. **La temperatura está en otro formato**
   - ✅ **Solución**: Revisa los logs de "🔍 T2M encontrado"
   - Puede que necesitemos ajustar cómo extraemos el valor

---

## 📝 Resumen Visual del Flujo

```
┌─────────────────────────────────────────┐
│  Usuario hace CLICK en objeto 3D       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  viewer.on("object-clicked")            │
│  → Obtiene elementData                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  displayObjectInfo(elementData)         │
│  → Extrae speckleData                    │
│  → Verifica ID                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  extractCoordinates(speckleData)         │
│  → Busca lat/lon en properties          │
│  → Si no encuentra, usa defaults        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  fetchTemperatureFromNASA(lat, lon)     │
│  → Construye URL                        │
│  → Hace fetch() a la API                │
│  → Procesa respuesta JSON               │
│  → Busca temperatura en estructura     │
│  → Convierte K → °C                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  displayObjectInfo (continúa)           │
│  → Genera HTML con temperatura          │
│  → Muestra en panel lateral             │
└─────────────────────────────────────────┘
```

---

## 🔧 Cómo Modificar para tu Caso

### Cambiar el ID Objetivo:
```typescript
const TARGET_OBJECT_ID = "TU_NUEVO_ID_AQUI";
```

### Cambiar Coordenadas por Defecto:
```typescript
// En extractCoordinates(), línea ~661
return { latitude: TU_LATITUD, longitude: TU_LONGITUD };
```

### Cambiar Rango de Temperaturas:
```typescript
// En displayObjectInfo(), línea ~266
const isHigh = temperature > 30;  // Cambiar de 25 a 30
const isLow = temperature < 10;  // Cambiar de 15 a 10
```

---

## 📚 Recursos Adicionales

- **NASA POWER API Docs**: https://power.larc.nasa.gov/docs/services/api/
- **Speckle Viewer Docs**: https://speckle.systems/docs/
- **JavaScript Fetch API**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

