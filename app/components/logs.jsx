PS C:\Users\dakla\OneDrive\Documentos\MATERIA.RUN\VIGA> npm run dev

> viga-dashboard@1.0.0 dev
> next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 2.7s
 ✓ Compiled /middleware in 180ms (72 modules)
 ○ Compiling /dashboard ...
 ✓ Compiled /dashboard in 3.6s (1284 modules)
 GET /dashboard 200 in 4291ms
 ✓ Compiled in 662ms (648 modules)
 ✓ Compiled /api/run-chaos in 360ms (706 modules)
[VIGA-BILLING] Charged 20 vigas to 2aab741e-56d0-4668-8e16-e2f174030baa for Chaos Run
 ✓ Compiled /execution in 437ms (1392 modules)
[CHAOS] ✅ Job created: bb0953ff-6b8b-43bd-ab70-8867b6b4d755 for suite f619aab1-f6e5-4012-9df8-0c8b40d82086
 POST /api/run-chaos 200 in 1377ms
 ✓ Compiled in 965ms (1336 modules)
 ✓ Compiled in 410ms (673 modules)
 ✓ Compiled in 638ms (673 modules)
 ✓ Compiled in 364ms (673 modules)
PS C:\Users\dakla\OneDrive\Documentos\MATERIA.RUN\VIGA> 
 *  History restored 

PS C:\Users\dakla\OneDrive\Documentos\MATERIA.RUN\VIGA> cd worker
PS C:\Users\dakla\OneDrive\Documentos\MATERIA.RUN\VIGA\worker> npm run dev

> viga-worker@1.0.0 dev
> tsx watch src/index.ts


╔═══════════════════════════════════════╗
║   VIGA CHAOS WORKER v1.0.0            ║
║   Autonomous Testing Agent            ║
╚═══════════════════════════════════════╝

⚠️ BROWSERLESS_WS not provided. Will use local browser.
[SUPABASE] 🧹 Checking for stale jobs...
[SUPABASE] ✨ No stale jobs found.
[WORKER] 🤖 VIGA Worker started
[WORKER] 📊 Poll interval: 3000ms
[WORKER] 🔄 Max retries: 3
[WORKER] 🌐 Browserless WS: ❌ Missing
[WORKER] 📥 Found 1 pending job(s)em Idle)...

┌──────────────────────────────────────────────────┐
│ JOB START: ea1f7cf2-51a5-4d32-bde0-4129a79f1a01
│ TYPE:      chaos
│ URL:       https://quartz-ai.vercel.app
├──────────────────────────────────────────────────┤
[WORKER] 🚀 Executing job ea1f7cf2-51a5-4d32-bde0-4129a79f1a01 (chaos) for suite 249af9fa-d46e-42ff-af3c-e82a98d2a4fc
⚠️ No BROWSERLESS_WS found. Launching local Chromium...
[CHAOS] 🚀 AGENTE CHAOS INICIANDO (Playwright-First)
[CHAOS] 🎯 URL objetivo: https://quartz-ai.vercel.app
[CHAOS] 🧠 Construyendo Mapa Mental inicial...
[VIGA-LLM] Usando key slot 1/3
[CHAOS] 🌍 Propósito detectado: El propósito del sitio es analizar la seguridad y el rendimiento de un sitio web a través de una auditoría en línea.
[CHAOS] 🔍 FASE 1: Exploración automática con Playwright
[CHAOS] 🧠 Cargando Memoria Persistente (Accelerated Regression)...
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 1: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[VIGA-LLM] Usando key slot 1/3
[JOURNEY] 🗺️ New State: Página de aterrizaje de QUARTZ AI con llamada a la acción para iniciar auditoría
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: La acción no tuvo éxito porque las HTML Classes cambiaron de 'dark' a 'light', lo que indica un cambio de tema visual, pero la intención era alternar a 'Light' y el estado después muestra 'Dark' en la interfaz visual. Sin embargo, según la REGLA DE ORO, el cambio de clase debería indicar éxito, pero en este caso, la clase cambió a 'light' que es lo opuesto a lo esperado.
[JOURNEY] 🗺️ Registered: Alternar tema visual a Light (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 2: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Alternar tema visual a Dark
[JOURNEY] 🗺️ Registered: Alternar tema visual a Dark (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 3: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Cambiar idioma a EN
[JOURNEY] 🗺️ Registered: Cambiar idioma a EN (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[CHAOS] [SMART] 🔄 Resultado obtenido: Esperando Usuario
[CHAOS] ⏩ Skipped 1 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 4: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: El atributo 'lang' sigue siendo 'en' en lugar de cambiar a 'es', y el texto visible no cambió completamente al español. No se cumplió la regla de oro para el tema/dark mode, ni se produjo un cambio en el idioma ni en la navegación.
[JOURNEY] 🗺️ Registered: Cambiar idioma a 'ES' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⏩ Skipped 1 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 5: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, el atributo 'lang', la URL, ni el contenido principal. El estado técnico del DOM permanece igual antes y después de la acción.        
[JOURNEY] 🗺️ Registered: Hacer clic en el botón 'Sitio Web' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 2 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 6: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Hacer clic en el botón 'Código'
[VIGA-LLM] Usando key slot 1/3
[JOURNEY] 🗺️ New State: Página de aterrizaje de QUARTZ AI con llamada a la acción para iniciar auditoría
[JOURNEY] 🗺️ Registered: Hacer clic en el botón 'Código' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[CHAOS] [SMART] 🔄 Resultado obtenido: Esperando Usuario
[CHAOS] ⏩ Skipped 3 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 7: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, Body Classes, Data-Theme, Lang Attribute, BG Color (Body), BG Color (HTML) o Text Color. La acción no tuvo efecto en el estado técnico del DOM.
[JOURNEY] 🗺️ Registered: Pegar código '<html>...</html>' en el área de texto 'Pega tu Código' (explored:: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 4 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 8: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, Lang Attribute, URL, ni contenido principal. El estado técnico del DOM permanece igual antes y después de la acción.
[JOURNEY] 🗺️ Registered: Pegar código '<html>...</html>' en el área de texto 'Pega tu Código' (explored:: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[CHAOS] [SMART] 🔄 Resultado obtenido: Esperando Usuario
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 4 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 9: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Pulsar el botón 'Iniciar Auditoría'
[VIGA-LLM] Usando key slot 1/3
[JOURNEY] 🗺️ New State: Página de aterrizaje de la aplicación QUARTZ AI
[JOURNEY] 🗺️ Registered: Pulsar el botón 'Iniciar Auditoría' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 268 chars)... Reset Stability. (1)
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 38 chars)... Reset Stability. (2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 1992 chars)... Reset Stability. (4)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⏩ Skipped 5 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ♟️ Estrategia Cortex: Explorar la página principal para encontrar puntos de entrada (Focus: headder nav)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 10: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 7 elementos interactivos
[VIGA-LLM] Usando key slot 1/3
[JOURNEY] 🗺️ New State: Página de aterrizaje de la aplicación QUARTZ AI
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, el atributo 'lang', la URL, ni el contenido principal. El texto del botón y los colores no son relevantes según las reglas de juicio. No se encontraron errores como '500', '404', 'Error' o 'Exception'. La acción no tuvo éxito según las reglas de juicio suprema.
[JOURNEY] 🗺️ Registered: Hacer clic en el botón 'Export PDF' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 2 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 11: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 7 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Hacer clic en el botón 'Nueva Auditoría'
[JOURNEY] 🗺️ Registered: Hacer clic en el botón 'Nueva Auditoría' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[CHAOS] [SMART] 🔄 Resultado obtenido: Esperando Usuario
[CHAOS] ⏩ Skipped 3 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 12: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, el atributo 'lang', la URL, ni el contenido principal. Además, no se detectaron errores visibles como '500', '404', 'Error' o 'Exception'. La acción de ingresar 'https://google.com' en el campo URL no parece haber tenido efecto en el estado técnico del sitio web.
[JOURNEY] 🗺️ Registered: Ingresar 'https://google.com' en el campo URL del sitio web (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 4 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 13: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[CHAOS] ⏩ Skipped 6 elementos repetidos
[CHAOS] ✅ Todas las acciones ya fueron probadas
[CHAOS] 🧠 FASE 2: Analizando cobertura (Thinking)...
[VIGA-LLM] Usando key slot 1/3
[CHAOS] 🎯 IA detectó 5 casos faltantes: 
[CHAOS]    1. Ingresar una URL válida y completar el flujo de auditoría de seguridad y rendimiento 
[CHAOS]    2. Pegar un código HTML válido en el área de texto y analizar su seguridad y rendimiento 
[CHAOS]    3. Iniciar una nueva auditoría con una URL diferente y comparar los resultados
[CHAOS]    4. Exportar el informe de auditoría en formato PDF y verificar su contenido
[CHAOS]    5. Ingresar una URL inválida o inexistente y verificar el manejo de errores del sistema      
[CHAOS] ⚔️ FASE 3: Ejecución activa (Multi-Step Flows) 🧩
[CHAOS] [IA] 🤔 Planificando: "Ingresar una URL válida y completar el flujo de auditoría de seguridad y rendimiento"
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] ⚡ Ejecutando flujo de 2 pasos...
[CHAOS] [IA] 👣 Paso 1/2: Ingresar una URL válida para el análisis de seguridad y rendimiento
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[JOURNEY] 🗺️ Registered: [Phase 3] fill en input (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 2/2: El elemento con el índice 5 es un botón con el texto 'Iniciar Auditoría', lo que coincide con la intención de clic en 'Iniciar Auditoría'.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 267 chars)... Reset Stability. (1)
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 278 chars)... Reset Stability. (2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[VIGA-LLM] Usando key slot 1/3
[JOURNEY] 🗺️ New State: Pantalla de error o mensaje de intentar nuevamente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Iniciar Auditoría (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ✅ Finalizado: No se logró el objetivo, ya que se muestra un mensaje de error indicando que no se pudo acceder a la web debido a posibles razones como bloqueo de accesos automáticos, URL inválida o indisponibilidad del sitio.
[CHAOS] [NAV] 🚨 No hay inputs(Página de Error / Reporte).Recuperando...
[CHAOS] [NAV] 🧭 Click en botón retorno: Intentar de Nuevo 
[CHAOS] [IA] 🤔 Planificando: "Pegar un código HTML válido en el área de texto y analizar su seguridad y rendimiento"
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] ⚡ Ejecutando flujo de 3 pasos...
[CHAOS] [IA] 👣 Paso 1/3: Se selecciona la pestaña 'Código' para acceder al área de ingreso de la URL o código, aunque en este contexto parece más relevante para código, pero seguimos el flujo de ingreso de URL
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Código (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 2/3: El elemento con id 4 es un textarea, que es un tipo de input, y tiene un placeholder y un texto que sugiere que se debe pegar algún código, lo que lo hace el candidato más probable para llenar con un valor.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] fill en Pega tu Código (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 3/3: El elemento con el id 5 es un botón con el texto 'Iniciar Auditoría', lo que coincide con la intención de clicar en el botón 'Iniciar Auditoría'.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 280 chars)... Reset Stability. (1)
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 277 chars)... Reset Stability. (2)
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 37 chars)... Reset Stability. (3)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Iniciar Auditoría (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ✅ Finalizado: Se logró el objetivo, ya que la página muestra que todos los agentes han completado su análisis y se han detectado vulnerabilidades y bloqueadores de conversión, indicando que el código HTML ha sido analizado con éxito.
[CHAOS] [NAV] 🚨 No hay inputs(Página de Error / Reporte).Recuperando...
[CHAOS] [NAV] 🔙 Forzando "Atrás" del navegador...
[CHAOS] [NAV] 🚨 RESET CRÍTICO: Navegando a https://quartz-ai.vercel.app 
[CHAOS] [IA] 🤔 Planificando: "Iniciar una nueva auditoría con una URL diferente y comparar los resultados"
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 🤔 Planificando: "Exportar el informe de auditoría en formato PDF y verificar su contenido"
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] ⚡ Ejecutando flujo de 8 pasos...
[CHAOS] [IA] 👣 Paso 1/8: Se llena el campo de texto con la URL del sitio web a auditar.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[JOURNEY] 🗺️ Registered: [Phase 3] fill en input (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 2/8: El elemento con el id 5 es un botón con el texto 'Iniciar Auditoría', lo que coincide con la intención de clic en 'Iniciar Auditoría'.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 278 chars)... Reset Stability. (1)
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 222 chars)... Reset Stability. (2)
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 94 chars)... Reset Stability. (3)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] 🧠 IA detectó "Estado Transitorio" (Aunque hay estabilidad técnica). Esperando...
[CHAOS] [SMART] 🌊 Dinámica detectada (Delta: 2107 chars)... Reset Stability. (6)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Resultado Listo
[JOURNEY] 🗺️ Registered: [Phase 3] click en Iniciar Auditoría (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 3/8: Aunque no hay un botón que diga 'Sitio Web', el botón 'Export PDF' podría ser el más relevante para acceder a un sitio web o compartir información relacionada con el reporte de auditoría.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Export PDF (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 4/8: Aunque no hay un botón con el texto 'Código', el botón 'Export PDF' podría estar relacionado con la visualización de detalles técnicos o informes que incluyen código.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Export PDF (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 5/8: El botón con el texto 'Light' coincide con la intención de clic en 'Light'.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Light (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 6/8: Aunque no hay un botón exacto con el texto 'Iniciar Auditoría', el botón 'Nueva Auditoría' podría ser el más relevante en el contexto de una auditoría, ya que iniciar una nueva auditoría es un paso lógico en el proceso.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Nueva Auditoría (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 7/8: El elemento con el id 1 es un botón con el texto 'EN', lo que coincide con la intención 'click en EN'.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en EN (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 8/8: El botón con el texto 'Start Audit' coincide con la intención de 'Iniciar Auditoría' y es el elemento más relevante en el estado actual.
[CHAOS] ❌ Falló el paso 8: Botón deshabilitado: Start Audit. Abortando flujo.
[CHAOS] [IA] 🤔 Planificando: "Ingresar una URL inválida o inexistente y verificar el manejo de errores del sistema"
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] ⚡ Ejecutando flujo de 2 pasos...
[CHAOS] [IA] 👣 Paso 1/2: Ingresar una URL inválida o inexistente en el campo de texto de la URL
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[JOURNEY] 🗺️ Registered: [Phase 3] fill en input (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [IA] 👣 Paso 2/2: El elemento con el índice 5 es un botón con el texto 'Start Audit', lo que coincide con la intención de hacer clic en el botón 'Start Audit'.
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[JOURNEY] 🗺️ Registered: [Phase 3] click en Start Audit (explored: true)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ✅ Finalizado: Se logró el objetivo, ya que la página muestra un mensaje de error claro y conciso indicando que no se pudo acceder a la web y ofrece posibles razones y soluciones.
[CHAOS] ✅ Exploración completada: 13 pasos, 1 páginas
[CHAOS] 🎥 Subiendo video de replay...
[CHAOS] ✅ Video de replay guardado exitosamente
[WORKER] ✅ Job ea1f7cf2-51a5-4d32-bde0-4129a79f1a01 completed successfully
└──────────────────────────────────────────────────┘

[WORKER] 📥 Found 1 pending job(s)em Idle)...

┌──────────────────────────────────────────────────┐
│ JOB START: b1a23176-7047-485a-a9d6-ffefd134a687
│ TYPE:      chaos
│ URL:       https://quartz-ai.vercel.app
├──────────────────────────────────────────────────┤
[WORKER] 🚀 Executing job b1a23176-7047-485a-a9d6-ffefd134a687 (chaos) for suite 2783cf2e-b426-4fc3-b602-399864b0467b
⚠️ No BROWSERLESS_WS found. Launching local Chromium...
[CHAOS] 🚀 AGENTE CHAOS INICIANDO (Playwright-First)
[CHAOS] 🎯 URL objetivo: https://quartz-ai.vercel.app
[CHAOS] 🧠 Construyendo Mapa Mental inicial...
[VIGA-LLM] Usando key slot 1/3
[CHAOS] 🌍 Propósito detectado: El propósito del sitio es analizar la seguridad y el rendimiento de una URL ingresada.
[CHAOS] 🔍 FASE 1: Exploración automática con Playwright
[CHAOS] 🧠 Cargando Memoria Persistente (Accelerated Regression)...
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 1: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[VIGA-LLM] Usando key slot 1/3
[JOURNEY] 🗺️ New State: Página de aterrizaje de Quartz AI para automatización de QA
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: La acción no tuvo éxito porque el texto del botón cambió a 'Dark' pero las HTML Classes cambiaron de 'dark' a 'light', lo que indica que el tema visual sigue siendo 'light' y no se alternó a 'Dark' como se esperaba. Además, el atributo 'data-theme' sigue siendo 'N/A', lo que sugiere que no se aplicó ningún tema específico.
[JOURNEY] 🗺️ Registered: Alternar tema visual a Light (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[CHAOS] [SMART] 🔄 Resultado obtenido: Esperando Usuario
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 2: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Alternar tema visual a Dark
[JOURNEY] 🗺️ Registered: Alternar tema visual a Dark (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 3: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Cambiar idioma a EN
[JOURNEY] 🗺️ Registered: Cambiar idioma a EN (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⏩ Skipped 1 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 4: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observó cambio en el atributo 'lang' del DOM, el texto visible no cambió completamente al idioma español y las clases HTML no cambiaron. El atributo 'lang' sigue siendo 'en' en lugar de 'es', lo que indica que la acción de cambiar el idioma no tuvo éxito.
[JOURNEY] 🗺️ Registered: Cambiar idioma a 'ES' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⏩ Skipped 1 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 5: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, el atributo 'lang', la URL, ni el contenido principal. El texto visible y los colores permanecieron iguales, lo que sugiere que la acción no tuvo el efecto esperado.
[JOURNEY] 🗺️ Registered: Hacer clic en el botón 'Sitio Web' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Esperando Usuario
[CHAOS] [SMART] 🔄 Resultado obtenido: Esperando Usuario
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 2 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 6: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] Hacer clic en el botón 'Código'
[VIGA-LLM] Usando key slot 1/3
[JOURNEY] 🗺️ New State: Página de aterrizaje de QUARTZ AI con llamada a la acción para iniciar auditoría
[JOURNEY] 🗺️ Registered: Hacer clic en el botón 'Código' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⏩ Skipped 3 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 7: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, Body Classes, Data-Theme, Lang Attribute, BG Color (Body), BG Color (HTML) o Text Color. La acción no tuvo efecto en el estado técnico del DOM.
[JOURNEY] 🗺️ Registered: Ingresar código HTML en el área de texto 'Pega tu Código' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 4 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 8: https://quartz-ai.vercel.app/ 
[CHAOS] [PW] 🔍 Detectados 6 elementos interactivos
[CHAOS] 📍 Mapa Mental: Estoy en [HOME]
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[VIGA-LLM] Usando key slot 1/3
[CHAOS] ❌ FALLO SEMÁNTICO: No se observaron cambios en las HTML Classes, Body Classes, Data-Theme, Lang Attribute, BG Color (Body), BG Color (HTML) o Text Color. La acción no tuvo efecto en el estado técnico del DOM.
[JOURNEY] 🗺️ Registered: Ingresar código HTML en el área de texto 'Pega tu Código' (explored: true)
[CHAOS] ⏳ [SMART WAIT] Esperando estabilidad (Protocolo Científico de Estabilidad)...
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (1/2)
[CHAOS] [SMART] ⚓ Estabilidad Técnica detectada (2/2)
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [SMART] ✅ Estabilidad Confirmada: Estado Persistente
[CHAOS] [SMART] 🔄 Resultado obtenido: Estado Persistente
[CHAOS] ⚠️ Estado sin cambios, probando siguiente elemento...
[CHAOS] ⏩ Skipped 4 elementos repetidos
[VIGA-LLM] Usando key slot 1/3
[CHAOS] [PW] 📍 Paso 9: https://quartz-ai.vercel.app/ 