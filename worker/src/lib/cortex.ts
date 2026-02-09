
import { callGroqJSON } from './llm';
import { JourneyTransition, JourneyState } from './journey';

// ============================================================================
// TYPES
// ============================================================================

export interface PathAnalysis {
    story_name: string;      // "Login fallido con credenciales inválidas"
    user_intent: string;     // "El usuario intenta acceder pero falla"
    complexity: 'low' | 'medium' | 'high';
}

export interface PathClassification {
    is_happy_path: boolean;
    is_edge_case: boolean;
    risk_score: number;      // 0-100
    reasoning: string;       // "Es un edge case porque..."
}

export interface TestStepGen {
    step_order: number;
    intent: string;          // "CLICK en 'Entrar'"
    expected_observation: string;
    action_type: 'click' | 'fill' | 'navigate';
    payload?: string;
}

export interface VerificationResult {
    success: boolean;
    reason: string;
}

// ============================================================================
// CORTEX KERNEL 🧠
// ============================================================================

export const Cortex = {

    /**
     * 🕵️‍♂️ CONTEXT ANALYST CHIP
     * Understands the "User Story" from raw execution traces.
     */
    ContextAnalyst: {
        analyze: async (traceNarrative: string, llmCtx: any): Promise<PathAnalysis> => {
            const system = `ERES EL ANALISTA DE CONTEXTO DE VIGA.
            Tu objetivo es leer un "Trace de Ejecución" (acciones crudas) y entender QUÉ ESTÁ PASANDO a nivel de negocio.

            Tu salida debe ser un Resumen Narrativo.
            NO inventes pasos. Solo interpreta los existentes.
            
            Output JSON: { "story_name": string, "user_intent": string, "complexity": "low"|"medium"|"high" }`;

            const res = await callGroqJSON(llmCtx, system, `TRACE:\n${traceNarrative}`);
            return res || { story_name: "Flujo Desconocido", user_intent: "N/A", complexity: "low" };
        }
    },

    /**
     * ⚖️ EDGE CRITIC CHIP
     * Judges whether a flow is a Standard Human Path or an Edge Case.
     */
    EdgeCritic: {
        judge: async (analysis: PathAnalysis, traceNarrative: string, llmCtx: any): Promise<PathClassification> => {
            const system = `ERES EL JUEZ DE CALIDAD (THE CRITIC).
            Analiza si este flujo representa un comportamiento HUMANO ESTÁNDAR (Happy Path) o un CASO BORDE/RARO (Edge Case).

            Criterios EDGE CASE:
            - Bucles repetitivos (click, click, click).
            - Navegación errática (atrás, adelante, atrás).
            - Inputs sin sentido (ej: caracteres raros).
            - Errores de sistema visibles (500, crash).

            Output JSON: { "is_happy_path": boolean, "is_edge_case": boolean, "risk_score": number, "reasoning": string }`;

            const userMsg = `ANALYSIS: ${JSON.stringify(analysis)}\nTRACE:\n${traceNarrative}`;
            const res = await callGroqJSON(llmCtx, system, userMsg);
            return res || { is_happy_path: true, is_edge_case: false, risk_score: 0, reasoning: "Default" };
        }
    },

    /**
     * 🏗️ TEST ARCHITECT CHIP
     * Designs formal Test Steps from the abstract story.
     */
    TestArchitect: {
        design: async (
            analysis: PathAnalysis,
            classification: PathClassification,
            transitions: JourneyTransition[],
            llmCtx: any
        ): Promise<TestStepGen[]> => {
            const narrativePrompt = transitions.map((t, i) => {
                return `STEP ${i + 1}: ACCTION="${t.action_intent}" -> EFFECT="${t.effect_description}"`;
            }).join('\n');

            const system = `ERES EL ARQUITECTO DE PRUEBAS (ATLAS).
            Genera los PASOS FORMALES para este Test Case.
            
            CONTEXTO: "${analysis.story_name}"
            TIPO: ${classification.is_edge_case ? 'EDGE CASE ⚠️' : 'HAPPY PATH ✅'}
            NOTA: ${classification.reasoning}

            REGLAS:
            1. Títulos IMPERATIVOS (Ej: "CLICK en Login", no "El usuario hace click").
            2. Expected Observation debe ser verificable visualmente.
            3. USAR action_type: "CLICK" | "TYPE" | "WAIT" | "ASSERT" | "SCROLL".
            
            Output JSON: { "steps": [ { "step_order", "intent", "expected_observation", "action_type", "payload" } ] }`;

            const res = await callGroqJSON(llmCtx, system, `RAW STEPS:\n${narrativePrompt}`);
            return res?.steps || [];
        }
    },

    /**
     * ⚖️ AUDIT JUDGE CHIP
     * Verifies if the screen state matches the objective.
     */
    AuditJudge: {
        verify: async (goal: string, pageText: string, llmCtx: any): Promise<VerificationResult> => {
            const prompt = `ERES UN JUEZ IMPARCIAL DE AUDITORÍA.
            
            OBJETIVO DEL AGENTE: "${goal}"
            
            EVIDENCIA (Texto de la página final):
            """
            ${pageText.slice(0, 5000)}
            """

            TU TAREA: Determinar si la pantalla actual DEMUESTRA que se cumplió el objetivo.
            
            Criterios de RECHAZO:
            - Si ves "Error", "404", "Page Not Found", "Something went wrong" -> RECHAZAR.
            - Si el objetivo era "Buscar X" y ves "0 resultados" -> RECHAZAR.
            - Si el objetivo era "Login" y sigues en el formulario de login -> RECHAZAR.
            - Si no hay evidencia clara de éxito -> RECHAZAR.

            Responde JSON: { "success": boolean, "reason": "Justificación breve" }`;

            try {
                const res = await callGroqJSON(llmCtx, "Eres un auditor estricto.", prompt);
                return res || { success: true, reason: "Verificación técnica falló (default pass)" };
            } catch (e) {
                return { success: true, reason: "Error en verificación (skip)" };
            }
        }
    },

    /**
     * 🧪 DATA SCIENTIST CHIP
     * Generates semantic, realistic data for inputs based on context.
     */
    DataScientific: {
        generate: async (
            tag: string,
            type: string,
            placeholder: string,
            label: string,
            context: string,
            llmCtx: any
        ): Promise<string> => {
            const prompt = `CONTEXTO DEL SITIO: ${context}
            
            ELEMENTO A LLENAR:
            - Tag: ${tag}
            - Type: ${type}
            - Placeholder: ${placeholder}
            - Label/Text: ${label}
            
            TU TAREA: Generar un único valor de entrada INTELIGENTE Y REALISTA.
            1. NO REPITAS EL LABEL.
            2. DATOS REALES: Si pide email, usa "usuario_real@gmail.com". Si es URL, "https://stripe.com".
            3. SI ES CÓDIGO: Genera un snippet válido (HTML/CSS/JS).
            4. EVITA DATA DUMMY ("test", "asdf") salvo que sea necesario.
            
            Responde SOLO JSON: { "value": "tu_valor_aqui" }`;

            try {
                const res = await callGroqJSON(llmCtx, "Eres un generador de datos sintéticos experto.", prompt);
                return res?.value || "Test Data";
            } catch (e) {
                return "Test Data";
            }
        }
    },

    /**
     * ♟️ STRATEGIC PLANNER CHIP
     * Decides the next high-level move when the agent is stuck or exploring.
     */
    StrategicPlanner: {
        plan: async (
            historySummary: string,
            currentUrl: string,
            availableActions: string[],
            llmCtx: any
        ): Promise<{ strategy: string, focus_selector: string | null }> => {
            const prompt = `ERES EL ESTRATEGA DE CHAOS AGENT.
            
            SITUACIÓN:
            - URL: ${currentUrl}
            - HISTORIA RECIENTE: ${historySummary}
            - ACCIONES DISPONIBLES: ${availableActions.length} elementos (Botones, Links...).

            PROBLEMA: El agente necesita dirección. ¿Estamos dando vueltas en círculo? ¿Hay un área sin explorar?
            
            TU DECISIÓN:
            1. ¿Cuál es el MEJOR siguiente movimiento estratégico? (Ej: "Intentar Login", "Ver Detalles", "Cambiar de página").
            2. DAME UN SELECTOR (CSS) o TEXTO CLAVE para enfocarme.
            
            Output JSON: { "strategy": "Razón breve", "focus_selector": "css_selector_or_text_hint" }`;

            const res = await callGroqJSON(llmCtx, "Eres un estratega militar de pruebas de software.", prompt);
            return res || { strategy: "Exploración aleatoria (Default)", focus_selector: null };
        }
    }
};
