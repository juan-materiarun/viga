# 🤖 VIGA by MATERIA.RUN
### *The Autonomous Testing Swarm*

VIGA no es solo una herramienta de testing; es un **ecosistema de agentes autónomos** diseñados para explorar, atacar y validar aplicaciones web como lo haría un humano, pero con la velocidad y precisión de una inteligencia artificial.

---

## 🌪️ ¿Qué es VIGA?

VIGA es un **Orquestador de Auditoría Autónoma**. En lugar de escribir manualmente scripts de Selenium o Playwright que se rompen al cambiar un simple ID, VIGA utiliza LLMs (Modelos de Lenguaje) para "entender" el DOM de una página y tomar decisiones en tiempo real.

### 🎭 Los 3 Rostros de VIGA (Agentes)
1.  **Chaos Agent 🌪️**: El explorador puro. Se suelta en una URL y empieza a clickear, llenar formularios y descubrir secciones para encontrar fallos inesperados.
2.  **Strike Agent 🎯**: El agente con misión. Le das un objetivo (ej: *"Activa el modo oscuro y dime si el contraste es bueno"*) y él razonará paso a paso hasta cumplirlo.
3.  **Replay Agent 🔁**: El guardián de regresión. Toma un test exitoso del pasado y lo vuelve a ejecutar. Si algo cambió en el código, usa su **Self-Healing** (Auto-curación) para arreglar el test solo.

---

## 🏗️ Arquitectura de Principio a Fin

VIGA utiliza una arquitectura **Desacoplada e Impulsada por Eventos** para garantizar escalabilidad y evitar los límites de tiempo de los servidores tradicionales.

### 🗺️ El Mapa del Tesoro

- **Frontend**: Next.js (Vercel) para el control total.
- **Queue**: Supabase (PostgreSQL) como cerebro de coordinación.
- **Worker**: Node.js (Railway) como motor de ejecución.
- **Browser**: Browserless.io como cuerpo físico del agente.
- **Brain**: Groq/OpenAI/Google como inteligencia lógica.

---

## ⚙️ Los Componentes del Cerebro

### 1. El Dashboard (Vercel + Next.js ⚛️)
*   **Función**: La interfaz de control (Mission Control).
*   **Misión**: Validar VIGAS (créditos), normalizar URLs y crear un registro en la tabla de `jobs` de Supabase. Es liviano, rápido y no ejecuta pesados procesos de automatización.

### 2. La Cola de Mensajería (Supabase ⚡)
*   **Función**: El puente de comunicación.
*   **Misión**: Actúa como un *Job Queue*. El dashboard escribe "qué hacer" y el worker lee de ahí. Esto permite que el test dure 1 minuto o 20 minutos sin que el frontend se bloquee o de timeout.

### 3. El Worker (Railway + Node.js 🚂)
*   **Función**: El músculo ejecutor.
*   **Misión**: Un proceso persistente que corre 24/7. Cuando ve un job pendiente, "posee" una instancia de navegador y empieza el ciclo de razonamiento (Loop ReAct):
    *   **Observación**: Escanea el DOM y lo limpia para la IA.
    *   **Pensamiento (Thought)**: La IA decide qué botón o campo es el más lógico.
    *   **Acción**: Ejecuta el click/type vía Playwright.

### 4. El Swarm de IA (Groq / OpenAI / Google 🧠)
*   **Función**: La inteligencia.
*   **Misión**: VIGA no depende de una sola llave. Tiene un sistema de **Key Rotation** y **Exponential Backoff** para saltarse los límites de velocidad (Rate Limits).

### 5. Navegación Remota (Browserless.io ☁️)
*   **Función**: El cuerpo del agente.
*   **Misión**: Se conecta por WebSocket (`wss://`) a un clúster de navegadores en la nube. Esto permite simular cualquier dispositivo sin gastar CPU propia.

---

---

## 🔁 Hybrid Regression & Self-Healing: El Guardián Eficiente

El agente de **Replay** no es un simple grabador de macros; es un motor híbrido diseñado para ser **veloz, robusto y extremadamente barato** de operar.

### 🧠 ¿Cómo funciona el Sistema Híbrido?

VIGA no usa la IA para todo. Divide la ejecución en dos capas:

1.  **Capa 1: Engineering Excellence (0 Tokens)** 🛠️
    *   Al repetir un test, el agente primero intenta usar **Locators puros de Playwright** (IDs, selectores CSS complejos y XPaths).
    *   Si la UI no ha cambiado, la acción se ejecuta en milisegundos y el costo de IA es **CERO**.
2.  **Capa 2: Neural Self-Healing (AI Rescue)** 🩹
    *   Si un selector falla (ej: cambiaste un ID de `login-btn` a `signin-form-button`), VIGA no detiene el test.
    *   En ese instante, despierta a la IA, le muestra la página actual y le dice: *"Búscame el elemento que solía ser este"*.
    *   La IA identifica el nuevo elemento por contexto y **cura el test en tiempo real**.

### 💎 Los "Puntos Buenos" (Highlights)

*   **Ahorro Masivo de Tokens 💰**: Solo gastas IA cuando tu código cambia. Si tu web es estable, los tests corren gratis.
*   **Adiós a los "Flaky Tests" 🛡️**: Las regresiones tradicionales se rompen por cambios menores de UI. VIGA sobrevive a rediseños completos sin que tengas que tocar una línea de código.
*   **Aprendizaje Automático (Learning) 📚**: Cuando la IA cura un selector, VIGA **actualiza automáticamente tu base de datos** en Supabase con el nuevo selector. La siguiente vez, volverá a usar la Capa 1 (0 tokens) con el dato actualizado.
*   **Velocidad de Ejecución ⚡**: Al priorizar la ejecución nativa de Playwright, los tests de regresión son hasta 10 veces más rápidos que los de exploración de IA pura.

---

## 📸 El Ciclo de Evidencia (Trust but Verify)

Cada vez que VIGA hace algo, deja huellas:
1.  **Screenshots**: Captura la pantalla después de cada acción importante.
2.  **DOM Snapshots**: Guarda el estado del código en ese momento.
3.  **Logs Neurales**: Registra en la DB por qué decidió hacer lo que hizo.
4.  **Storage**: Todo vuela a Supabase Storage para auditoría posterior.

---

## 🏗️ La Base de Conocimientos: Nuestra Estructura de Datos

VIGA no solo ejecuta; **recuerda**. Su base de datos en Supabase está diseñada para ser el historial clínico de tu aplicación.

### 🗄️ Esquema de Datos Principal

*   **`jobs` (La Cola) 🎟️**: Gestiona el estado de vida de cada test (`pending` ➔ `running` ➔ `completed`). Aquí se guarda qué agente corre, en qué URL y con qué meta-datos.
*   **`test_suites` (Las Misiones) 📂**: Agrupa todas las ejecuciones. Es donde definimos si un test es una "Exploración Chaos" o una "Regresión Guardada".
*   **`test_steps` (El ADN del Test) 🧬**: Es la tabla más rica. Guarda la acción realizada, capturas de pantalla, los selectores CSS/XPath originales y el resultado final.
*   **`agent_logs` (La Caja Negra) 📝**: Almacena cada pensamiento del agente en tiempo real para que el desarrollador pueda auditar el "razonamiento" de la IA.
*   **`discovered_elements` (La Memoria Visual) 👁️**: VIGA cataloga cada botón y link que encuentra. Esto le permite saber qué secciones de tu web ya fueron exploradas y cuáles no.
*   **`profiles` (Economía VIGA) 💰**: Controla los recursos (VIGAS) del usuario, asegurando que el sistema sea sostenible y escalable para modelos SaaS.

### ☁️ Almacenamiento de Archivos (Storage)
VIGA utiliza **Supabase Storage** para guardar imágenes de alta resolución. Cada paso genera una evidencia visual que se vincula mediante URLs públicas, permitiendo que el Dashboard renderice un reporte detallado.

---

## 🛡️ ¿Por qué es Especial esta Arquitectura?

*   **Anti-Timeout**: Al estar en Railway (Worker) y no en Vercel (Serverless), los tests pueden durar lo necesario.
*   **Self-Healing**: Si el código cambia, el agente de Replay se da cuenta y **corrige el test automáticamente**.
*   **Escalabilidad**: Puedes encender 10 workers en Railway y procesar 10 tests en paralelo sin que el Dashboard se entere.

---

### 🎉 VIGA: "Don't just test code, understand it."
**By MATERIA.RUN** ⚡
