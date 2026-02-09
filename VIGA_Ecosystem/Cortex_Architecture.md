# 🧠 Arquitectura Cortex
> **El Núcleo Cognitivo de VIGA**

> [!NOTE]
> **Definición**: Cortex es la arquitectura de **microservicios de inteligencia** que desacopla la *Ejecución* (Playwright) de la *Cognición* (LLM).

## 1. ¿Qué es Cortex?
Mientras que **Playwright** proporciona las manos y **Supabase** la memoria, **Cortex** es el cerebro. No es un simple archivo de utilidades; es un sistema diseñado para escalar la inteligencia de calidad (QA).

> [!IMPORTANT]
> **Filosofía**: En VIGA, ningún agente toma decisiones críticas sin consultar a Cortex. Esto asegura consistencia y calidad humana en cada paso.

---

## 2. La Arquitectura de Chips Neuronal 🔌
En lugar de usar un modelo gigante para todo, usamos chips especializados. Cada chip es un experto en una sola tarea cognitiva.

| Chip 💾 | Rol 🎭 | Función Crítica 🛠️ | Usuario 🤖 |
| :--- | :--- | :--- | :--- |
| **`ContextAnalyst`** | 🕵️‍♂️ Detective | Lee logs crudos y narra la *Historia del Usuario*. | **Atlas** |
| **`EdgeCritic`** | ⚖️ Juez | Clasifica si un flujo es "Happy Path" o "Edge Case". | **Atlas** |
| **`TestArchitect`** | 🏗️ Ingeniero | Convierte historias en *Test Steps* formales. | **Atlas** |
| **`AuditJudge`** | 👨‍⚖️ Auditor | Verifica visualmente si se cumplió el objetivo. | **Strike** |
| **`DataScientific`** | 🧪 Científico | Genera datos sintéticos válidos (ej: Emails reales). | **Chaos** |
| **`StrategicPlanner`** | ♟️ General | Decide movimientos estratégicos para evitar bucles. | **Chaos** |

---

## 3. Cortex API: "Intelligence as a Service" 🚀
> [!TIP]
> **Oportunidad de Negocio**: Esta arquitectura puede desacoplarse y venderse como una API SaaS para equipos de QA externos.

Las empresas con tests frágiles podrían usar Cortex para:
1.  **Auto-Healing**: Reparar selectores rotos en tiempo real.
2.  **Smart Data**: Generar datos de prueba contextuales.
3.  **Visual Audit**: Verificar resultados con visión humana.

---

## 4. Implementación Técnica
El código reside en `worker/src/lib/cortex.ts` y sigue un patrón funcional puro:

```typescript
// Ejemplo: El Auditor verifica un resultado
const veredicto = await Cortex.AuditJudge.verify(
    "El usuario debe ver el Dashboard", 
    bodyText
);

if (!veredicto.success) {
    throw new Error(veredicto.reason);
}
```
