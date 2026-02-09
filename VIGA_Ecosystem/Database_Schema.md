# 🗄️ Esquema de Base de Datos VIGA
> **La Capa de Persistencia del Ecosistema**

> [!NOTE]
> VIGA utiliza **Supabase (PostgreSQL)** no solo para logs, sino para construir un **Grafo de Conocimiento** persistente de la aplicación bajo prueba.

## 1. El Grafo de Conocimiento (Knowledge Graph)
Estas tablas permiten que el agente "recuerde" caminos y estados, volviéndose más inteligente con cada ejecución.

| Tabla | 🗝️ Clave | Descripción del Modelo |
| :--- | :--- | :--- |
| **`journey_states`** | `id`, `url` | Cada pantalla única visitada. Contiene un "Mapa Mental" de elementos clave. |
| **`journey_transitions`** | `from_id` -> `to_id` | Las "aristas" del grafo. Acciones que llevan de A a B. |
| **`ui_actions`** | `fingerprint` | Catálogo global de botones e inputs, identificados por hash único. |

> [!TIP]
> **Fingerprinting**: Usamos MD5(tag + type + label) para reconocer el mismo botón incluso si cambia de ID o de posición.

---

## 2. Ejecución de Pruebas (Test Runs)
Tablas transaccionales donde se registran las auditorías en tiempo real.

### 🏗️ Planificación (Atlas)
*   **`test_journeys`**: Un "Caso de Prueba" sintetizado por Atlas.
    *   *Ejemplo:* "Login Fallido con Contraseña Incorrecta".
*   **`test_case_steps`**: La receta paso a paso para ejecutar ese caso.

### 🎯 Ejecución (Strike / Playwright)
*   **`test_suites`**: El contenedor de una ejecución completa (Job).
*   **`test_steps`**: El log atómico de cada acción.
    *   ✅ `status: success`
    *   📸 `screenshot_url`

```sql
-- Ejemplo de Consulta: Obtener pasos fallidos
SELECT * FROM test_steps 
WHERE status = 'failed' 
AND suite_id = 'job-123';
```
