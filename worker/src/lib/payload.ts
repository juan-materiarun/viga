import { UIElement } from './fingerprint';

export interface ContextEnvelope {
    page_type?: string;
    purpose?: string;
    journey_state?: string;
    semantic_type?: string | null;
    element_hint?: string;
    page_context_snapshot?: string;
}

export class SemanticPayloadGenerator {
    /**
     * Generates a coherent payload based on semantic type and page context.
     * Moves away from "blind" heuristics towards context-aware generation.
     */
    static generate(element: UIElement, context: ContextEnvelope, credentials?: any): string {
        const type = context.semantic_type || this.inferType(element);
        const pagePurpose = (context.purpose || '').toLowerCase();
        const pageType = (context.page_type || '').toLowerCase();

        // 1. Specific Semantic Overrides (Persistent Knowledge)
        switch (type) {
            case 'AUDIT_TARGET_URL':
                return 'https://viga.dev';
            case 'CODE_EDITOR':
                return this.sampleCodeSnippet(pagePurpose);
            case 'EMAIL_LOGIN':
                return credentials?.username || 'test@viga.dev';
            case 'PASSWORD_LOGIN':
                return credentials?.password || 'TestPass123!';
            case 'SEARCH_QUERY':
                return 'test scenario ' + (context.journey_state || '');
        }

        // 2. Context-Aware Heuristics
        if (pageType === 'AUDIT_CONFIG' || pagePurpose.includes('audit') || pagePurpose.includes('analiz')) {
            if (element.tag === 'textarea' || type === 'TEXT_AREA') {
                return this.sampleCodeSnippet(pagePurpose);
            }
        }

        // 3. Fallback to Legacy-style heuristics but with better context
        return this.legacyFallback(element, credentials);
    }

    private static inferType(element: UIElement): string {
        const hint = (element.hint || '').toLowerCase();
        const name = (element.attributes?.name || '').toLowerCase();
        const placeholder = (element.attributes?.placeholder || '').toLowerCase();
        const context = `${hint} ${name} ${placeholder}`;

        if (context.includes('html') || context.includes('css') || context.includes('js') || context.includes('code') || context.includes('código')) return 'CODE_EDITOR';
        if (context.includes('url') || context.includes('website') || context.includes('sitio')) return 'AUDIT_TARGET_URL';
        if (context.includes('email') || context.includes('correo')) return 'EMAIL_LOGIN';
        if (context.includes('pass') || context.includes('contraseña')) return 'PASSWORD_LOGIN';

        return 'GENERIC_TEXT';
    }

    private static sampleCodeSnippet(purpose: string): string {
        if (purpose.includes('html') || purpose.includes('web')) {
            return `<!DOCTYPE html>
<html>
<head><title>VIGA Test</title></head>
<body><h1>Audit in progress</h1></body>
</html>`;
        }
        if (purpose.includes('css') || purpose.includes('style')) {
            return `body { 
  background: #f0f0f0; 
  font-family: sans-serif; 
}
.audit-target { border: 1px solid red; }`;
        }
        return `// VIGA Automated Snippet
function audit() {
  console.log("Analyzing...");
  return true;
}`;
    }

    private static legacyFallback(element: UIElement, credentials?: any): string {
        const type = (element.attributes?.type || '').toLowerCase();
        const hint = (element.hint || '').toLowerCase();

        if (type === 'url' || hint.includes('url')) return 'https://viga.dev';
        if (type === 'email' || hint.includes('email')) return credentials?.username || 'test@viga.dev';
        if (type === 'password' || hint.includes('pass')) return credentials?.password || 'TestPass123!';
        if (type === 'tel' || hint.includes('phone')) return '+5491112345678';
        if (type === 'number') return '42';

        return 'Valor de Prueba';
    }
}
