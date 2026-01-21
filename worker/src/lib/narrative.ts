/**
 * Test Narrative Generation (Chaos v3 Phase 1)
 * 
 * Generates human-readable test case narratives from execution steps.
 */

export interface TestStep {
    id: string;
    title: string;
    status: 'success' | 'failed' | 'warning' | 'running';
    expected_result?: string;
    action_type?: string;
    created_at?: string;
}

export interface TestNarrative {
    objective: string;
    preconditions: string;
    steps_summary: string;
    result: string;
    full_narrative: string;
}

/**
 * Generate a human-readable test narrative from executed steps.
 */
export function generateTestNarrative(steps: TestStep[]): TestNarrative {
    if (steps.length === 0) {
        return {
            objective: 'Test sin pasos ejecutados',
            preconditions: 'N/A',
            steps_summary: 'No se ejecutaron pasos',
            result: 'Incompleto',
            full_narrative: 'No hay datos suficientes para generar narrativa.'
        };
    }

    const mainFlow = inferMainFlow(steps);
    const successCount = steps.filter(s => s.status === 'success').length;
    const totalCount = steps.length;
    const successRate = Math.round((successCount / totalCount) * 100);

    const objective = `Validar flujo completo de ${mainFlow}`;
    const preconditions = 'Usuario en página inicial con sesión activa';

    const steps_summary = steps
        .slice(0, 10) // First 10 steps for summary
        .map((s, i) => `${i + 1}. ${s.title}`)
        .join('\n');

    const result = successRate === 100
        ? `✅ Flujo completado exitosamente (${totalCount} pasos)`
        : `⚠️ Flujo parcial: ${successCount}/${totalCount} pasos exitosos (${successRate}%)`;

    // phase 4.3: Executive Summary
    const warnings = steps.filter(s => s.status === 'warning').map(s => s.title);
    const topRisks = warnings.slice(0, 3).map(w => `- ⚠️ Warning en paso: "${w}"`).join('\n') || '✅ Ninguno detectado.';

    const executiveSummary = `
## 📑 Executive Summary
- **Stability Score**: ${successRate >= 90 ? '🟢 Alta' : successRate >= 70 ? '🟡 Media' : '🔴 Baja'} (${successRate}%)
- **Flow Validated**: ${mainFlow}
- **Top Risks**:
${topRisks}
    `.trim();

    const full_narrative = `
${executiveSummary}

---

**Objetivo**: ${objective}

**Precondiciones**: ${preconditions}

**Pasos Ejecutados** (${totalCount} total):
${steps_summary}
${totalCount > 10 ? `\n... y ${totalCount - 10} pasos adicionales` : ''}

**Resultado**: ${result}
    `.trim();

    return {
        objective,
        preconditions,
        steps_summary,
        result,
        full_narrative
    };
}

/**
 * Infer the main flow type from step titles and action types.
 */
function inferMainFlow(steps: TestStep[]): string {
    const titles = steps.map(s => s.title.toLowerCase()).join(' ');

    // Check for common patterns
    if (titles.includes('descargar') || titles.includes('download')) {
        return 'descarga de recursos';
    }

    if (titles.includes('enviar') || titles.includes('submit') || titles.includes('guardar')) {
        return 'envío de formulario';
    }

    if (titles.includes('login') || titles.includes('iniciar sesión') || titles.includes('autenticación')) {
        return 'autenticación de usuario';
    }

    const navigationCount = steps.filter(s =>
        s.title.toLowerCase().includes('navegar') ||
        s.action_type === 'navigation'
    ).length;

    if (navigationCount > 2) {
        return 'navegación multi-página';
    }

    if (titles.includes('theme') || titles.includes('tema') || titles.includes('idioma')) {
        return 'configuración de preferencias';
    }

    return 'interacción con interfaz de usuario';
}
