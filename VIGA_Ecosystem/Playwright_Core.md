# 🎭 Playwright Core
> **Las Manos Cinéticas de VIGA**

> [!NOTE]
> VIGA adopta una filosofía **"Playwright-First"**. Creemos que interactuar con el DOM es fundamentalmente más robusto que usar agentes de visión pura.

## 1. Arquitectura de Ejecución
VIGA puede correr en dos modos, adaptándose al entorno:

*   ☁️ **Cloud (Producción)**: Conexión vía WebSocket a **Browserless.io**.
    *   *Ventaja*: Escala a 1000 navegadores simultáneos.
*   💻 **Local (Dev)**: Lanza instancias de Chromium en la máquina del usuario.
    *   *Ventaja*: Depuración visual en tiempo real.

---

## 2. El Sistema "Hunter" (Localización) 🏹
Para encontrar un elemento, VIGA no se rinde fácil. Usa una estrategia en cascada:

1.  🥇 **Selector Estricto**: `data-testid="submit-btn"` (Infalible).
2.  🥈 **Selector Semántico**: `button[type="submit"]` (Robusto).
3.  🥉 **Selector de Texto**: `text="Iniciar Sesión"` (Humano).
4.  🤖 **Cortex Vision**: Si todo falla, la IA analiza el HTML y busca el reemplazo.

## 3. Protocolo "Smart Wait" ⏳
> [!IMPORTANT]
> Los `sleep(5000)` están prohibidos. VIGA usa esperas inteligentes para máxima velocidad.

*   **`networkidle`**: Espera a que la red se calme.
*   **Estabilidad Visual**: Mide si el DOM dejó de crecer/cambiar.
*   **Detector de Loading**: Si espera mucho, **Chaos Strategist** verifica si es un spinner infinito o un crash real.
