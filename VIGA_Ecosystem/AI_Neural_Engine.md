# ⚡ Motor Neuronal de IA
> **La Red Sináptica de VIGA**

> [!IMPORTANT]
> **Filosofía Híbrida**: VIGA no es una "Caja Negra". Utilizamos un enfoque **Neuro-Simbólico** que combina la precisión del Código con la intuición de la IA.

## 1. La Estrategia Neuro-Simbólica
| Componente | Rol | Naturaleza |
| :--- | :--- | :--- |
| **Simbólico (Playwright)** | 🦾 Cuerpo | Determinista, Rápido, Preciso. "Click aquí". |
| **Neuronal (Groq LLM)** | 🧠 Mente | Probabilístico, Creativo, Adaptable. "¿Qué clickear?". |

---

## 2. Infraestructura LLM
Utilizamos **Groq** para inferencia ultra-rápida.
*   **Modelo**: `llama-3-70b-versatile`
*   **Latencia**: < 1 segundo por decisión.
*   **Contexto**: Gestión automática de ventanas y Rate Limiting.

> [!WARNING]
> **Costos & Velocidad**: No usamos GPT-4o para todo porque sería lento y costoso. Groq permite iteraciones en tiempo real.

---

## 3. El Concepto de "Sinapsis"
Cada decisión es un ciclo de 4 pasos llamado **Sinapsis**:

1.  👁️ **Estímulo**: El código captura el estado (HTML/Texto).
2.  📡 **Transmisión**: Se envía al Chip Cortex apropiado.
3.  ⚙️ **Procesamiento**: El LLM decide y retorna JSON estricto.
4.  ⚡ **Acción**: El código ejecuta la decisión física.

## 4. Ingeniería de Prompts "VIGA Standard"
Nuestros prompts siguen reglas estrictas para asegurar estabilidad.

*   ✅ **Persona**: *"Eres un Ingeniero QA Senior..."*
*   ✅ **Formato**: *"Responde SOLO JSON válido."*
*   ✅ **Defensividad**: *"Si no sabes, responde null."*
