/**
 * Semantic Action Fingerprinting Library
 * 
 * This module provides utilities to create stable, semantic fingerprints
 * for UI actions. Fingerprints are used to identify the same action
 * across different runs, even if selectors change.
 */

import crypto from 'crypto';

export interface UIElement {
    i: number;
    tag: string;
    text: string;
    hint: string;
    selector: string;
    xpath: string;
    container_context?: string; // V3.1: Track semantic container
    attributes?: {
        type?: string;
        name?: string;
        id?: string;
        role?: string;
        ariaSelected?: string;
        checked?: boolean;
        'aria-label'?: string;
        'aria-pressed'?: string;
        placeholder?: string;
    };
}

export interface ActionFingerprint {
    role: string;
    ariaLabel: string;
    inputType: string;
    tag: string;
    urlPattern: string;
    containerContext: string;
    textHint: string; // First 30 chars of visible text
}

/**
 * Compute a stable fingerprint for a UI element based on semantic properties.
 * This fingerprint should remain stable even if CSS classes or structure changes.
 */
export function computeFingerprint(element: UIElement, pageUrl: string): string {
    const fp: ActionFingerprint = {
        role: element.attributes?.role || inferRole(element),
        ariaLabel: normalizeText(element.attributes?.['aria-label'] || ''),
        inputType: element.attributes?.type || '',
        tag: element.tag.toLowerCase(),
        urlPattern: normalizeUrl(pageUrl),
        containerContext: detectContainer(element),
        textHint: normalizeText(element.hint?.split('|')[0] || element.text || '').slice(0, 30)
    };

    // Create deterministic hash
    const normalized = JSON.stringify(fp, Object.keys(fp).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Normalize URL by removing query params, hash, and trailing slashes.
 * This groups actions from the same page together.
 */
export function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        // Keep only origin + pathname, remove trailing slash
        return `${u.origin}${u.pathname}`.replace(/\/$/, '');
    } catch {
        return url;
    }
}

/**
 * Detect the semantic container of an element (header, nav, form, modal, footer).
 * This helps differentiate similar elements in different contexts.
 */
export function detectContainer(element: UIElement): string {
    const sel = (element.selector || '').toLowerCase();
    const hint = (element.hint || '').toLowerCase();

    if (sel.includes('header') || sel.includes('navbar') || hint.includes('header')) return 'header';
    if (sel.includes('nav') || sel.includes('menu') || hint.includes('navigation')) return 'navigation';
    if (sel.includes('form') || sel.includes('login') || sel.includes('signup')) return 'form';
    if (sel.includes('modal') || sel.includes('dialog') || sel.includes('popup')) return 'modal';
    if (sel.includes('footer')) return 'footer';
    if (sel.includes('sidebar') || sel.includes('aside')) return 'sidebar';

    return 'main';
}

/**
 * Infer semantic role from element tag and attributes.
 */
function inferRole(element: UIElement): string {
    const tag = element.tag.toLowerCase();
    const type = element.attributes?.type || '';
    const hint = (element.hint || '').toLowerCase();

    // Input types
    if (tag === 'input') {
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        if (type === 'submit') return 'submit-button';
        if (type === 'password') return 'password-input';
        if (type === 'email') return 'email-input';
        if (type === 'search') return 'search-input';
        return 'text-input';
    }

    if (tag === 'button') {
        if (hint.includes('toggle') || hint.includes('switch') || hint.includes('theme')) return 'toggle';
        if (hint.includes('submit') || hint.includes('enviar') || hint.includes('send')) return 'submit-button';
        if (hint.includes('close') || hint.includes('cerrar') || hint.includes('cancel')) return 'close-button';
        return 'button';
    }

    if (tag === 'a') return 'link';
    if (tag === 'select') return 'dropdown';
    if (tag === 'textarea') return 'textarea';

    return tag;
}

export type SemanticIntent = 'DOWNLOAD' | 'NAVIGATION' | 'SUBMIT' | 'TOGGLE' | 'EXPORT' | 'INPUT' | 'ACTION' | 'UNKNOWN';

/**
 * Infer the semantic intent of an action based on its properties.
 * This categorizes the "purpose" of the action (e.g., Export vs Navigation).
 */
export function inferIntent(element: UIElement): SemanticIntent {
    const tag = element.tag.toLowerCase();
    const role = element.attributes?.role || inferRole(element);
    const label = (element.attributes?.['aria-label'] || '').toLowerCase();
    const text = (element.text || '').toLowerCase();
    const hint = (element.hint || '').toLowerCase();
    const type = (element.attributes?.type || '').toLowerCase();

    const context = `${label} ${text} ${hint}`.trim();

    // 1. INPUT (Strictly text entry)
    if (tag === 'textarea' || (tag === 'input' && !['button', 'submit', 'checkbox', 'radio', 'file'].includes(type))) {
        return 'INPUT';
    }

    // 2. TOGGLE
    if (role === 'toggle' || role === 'switch' || role === 'checkbox' || role === 'radio' || context.includes('toggle') || context.includes('alternar')) {
        return 'TOGGLE';
    }

    // 3. EXPORT / SHARE
    if (context.includes('export') || context.includes('share') || context.includes('compartir') || context.includes('imprimir') || context.includes('print')) {
        return 'EXPORT';
    }

    // 4. DOWNLOAD
    if (context.includes('download') || context.includes('descargar') || context.includes('bajar') || context.includes('guardar como')) {
        return 'DOWNLOAD';
    }

    // 5. SUBMIT / FORM ACTION
    if (role === 'submit-button' || type === 'submit' || context.includes('enviar') || context.includes('confirmar') || context.includes('save') || context.includes('guardar')) {
        return 'SUBMIT';
    }

    // 6. NAVIGATION
    if (tag === 'a' || role === 'link' || context.includes('nav') || context.includes('menu') || context.includes('home') || context.includes('inicio') || context.includes('volver')) {
        return 'NAVIGATION';
    }

    // 7. GENERAL ACTION
    if (tag === 'button' || role === 'button' || role.includes('button')) {
        return 'ACTION';
    }

    return 'UNKNOWN';
}

export type ActionCategory = 'STANDARD' | 'GLOBAL_STATE' | 'NAVIGATION' | 'FORM_SUBMIT';

/**
 * Infer the action category for v3 global state handling.
 * GLOBAL_STATE actions are reversible and don't consume coverage.
 */
export function inferActionCategory(element: UIElement, intent: SemanticIntent): ActionCategory {
    const hint = (element.hint || '').toLowerCase();
    const text = (element.text || '').toLowerCase();
    const label = (element.attributes?.['aria-label'] || '').toLowerCase();

    const context = `${hint} ${text} ${label}`.trim();

    // Global state indicators (theme, language, sidebar)
    if (intent === 'TOGGLE' && (
        context.includes('theme') || context.includes('tema') ||
        context.includes('language') || context.includes('idioma') || context.includes('lang') ||
        context.includes('dark') || context.includes('light') || context.includes('oscuro') || context.includes('claro') ||
        context.includes('sidebar') || context.includes('menu') && context.includes('toggle')
    )) {
        return 'GLOBAL_STATE';
    }

    if (intent === 'NAVIGATION') return 'NAVIGATION';
    if (intent === 'SUBMIT') return 'FORM_SUBMIT';
    return 'STANDARD';
}

/**
 * Normalize text for comparison: lowercase, trim, collapse whitespace.
 */
function normalizeText(text: string): string {
    return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * V3.1 HOTFIX: Generate canonical name using REAL semantic intent from context.
 * DO NOT use button label literally. Infer the actual user journey action.
 */
export function generateCanonicalName(element: UIElement, actionType: 'click' | 'type'): string {
    const rawLabel = extractBestLabel(element);
    const label = sanitizeLabel(rawLabel);
    const intent = inferIntent(element);
    const container = element.container_context || detectContainer(element);
    const hint = (element.hint || '').toLowerCase();

    // V3.1: Context-aware intent (not literal button text)

    // View/Mode Switchers (toolbar/nav buttons)
    if (hint.includes('código') || hint.includes('code') || label?.toLowerCase().includes('code')) {
        if (container === 'nav' || hint.includes('tab') || hint.includes('vista')) {
            return 'Cambiar vista a Editor de Código';
        }
    }

    if (hint.includes('sitio') || hint.includes('preview') || hint.includes('web') || label?.toLowerCase().includes('preview')) {
        if (container === 'nav' || hint.includes('tab')) {
            return 'Cambiar vista a Preview';
        }
    }

    if (hint.includes('diseño') || hint.includes('design') || hint.includes('layout')) {
        return 'Cambiar vista a Diseño';
    }

    // Theme/Settings (Global State - must be explicit)
    if (hint.includes('theme') || hint.includes('tema') || hint.includes('dark') || hint.includes('light')) {
        const targetTheme = hint.includes('dark') || hint.includes('oscuro') ? 'oscuro' : 'claro';
        return `Cambiar tema a ${targetTheme}`;
    }

    if (hint.includes('idioma') || hint.includes('language') || hint.includes('lang')) {
        return 'Cambiar idioma';
    }

    // Intent-based naming (V3 Phase 2)
    switch (intent) {
        case 'DOWNLOAD':
            return `Descargar "${label || 'archivo'}"`;
        case 'EXPORT':
            return `Exportar "${label || 'datos'}"`;
        case 'NAVIGATION':
            return `Navegar a "${label || 'sección'}"`;
        case 'SUBMIT':
            return `Enviar formulario "${label || 'principal'}"`;
        case 'TOGGLE':
            return `Alternar "${label || 'opción'}"`;
        case 'INPUT':
            return `Completar campo "${label || 'texto'}"`;
    }

    // Fallback to role-based naming if intent is generic ACTION/UNKNOWN
    const role = element.attributes?.role || inferRole(element);
    const actionVerbs: Record<string, Record<string, string>> = {
        click: {
            'checkbox': 'Marcar/Desmarcar',
            'radio': 'Seleccionar',
            'submit-button': 'Enviar',
            'close-button': 'Cerrar',
            'button': 'Activar',
            'link': 'Ir a',
            'dropdown': 'Abrir',
            'default': 'Interactuar con'
        },
        type: {
            'password-input': 'Ingresar contraseña en',
            'email-input': 'Ingresar email en',
            'search-input': 'Buscar',
            'text-input': 'Escribir en',
            'textarea': 'Escribir en',
            'default': 'Escribir en'
        }
    };

    const verbs = actionVerbs[actionType] || actionVerbs.click;
    const verb = verbs[role] || verbs.default;

    if (label) {
        return `${verb} "${label}"`;
    } else {
        return `${verb} elemento ${role}`;
    }
}

/**
 * V3.1 HOTFIX: Sanitize labels to prevent HTML/DOM content leakage
 */
function sanitizeLabel(label: string | undefined): string {
    if (!label) return '';

    let clean = label.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    if (clean.length > 50) clean = clean.substring(0, 47) + '...';
    if (clean.includes('function') || clean.includes('const ') || clean.includes('{')) return '';

    return clean;
}

/**
 * Extract the best human-readable label for an element.
 */
function extractBestLabel(element: UIElement): string {
    // Priority: aria-label > placeholder > visible text > name > id
    const ariaLabel = element.attributes?.['aria-label'];
    if (ariaLabel && ariaLabel.length > 2) return ariaLabel.slice(0, 40);

    const placeholder = element.attributes?.placeholder;
    if (placeholder && placeholder.length > 2) return placeholder.slice(0, 40);

    // From hint (first part before |)
    const hintPart = element.hint?.split('|')[0]?.trim();
    if (hintPart && hintPart.length > 2 && hintPart.length < 50) return hintPart;

    // Visible text
    const text = element.text?.trim();
    if (text && text.length > 2 && text.length < 50) return text;

    // Name attribute
    const name = element.attributes?.name;
    if (name) return name.replace(/[-_]/g, ' ');

    return '';
}

/**
 * Compute similarity score between a stored action and a new element.
 * Returns a score from 0.0 to 1.0.
 */
export function computeSimilarity(
    storedAction: { role: string; aria_label: string; tag: string; url_pattern: string; container_context: string },
    element: UIElement,
    pageUrl: string
): number {
    let score = 0;
    let weights = 0;

    const newFp = {
        role: element.attributes?.role || inferRole(element),
        ariaLabel: normalizeText(element.attributes?.['aria-label'] || ''),
        tag: element.tag.toLowerCase(),
        urlPattern: normalizeUrl(pageUrl),
        containerContext: detectContainer(element)
    };

    // URL Pattern match (weight: 3)
    if (storedAction.url_pattern === newFp.urlPattern) {
        score += 3;
    }
    weights += 3;

    // Tag match (weight: 2)
    if (storedAction.tag === newFp.tag) {
        score += 2;
    }
    weights += 2;

    // Role match (weight: 2)
    if (storedAction.role === newFp.role) {
        score += 2;
    }
    weights += 2;

    // Container match (weight: 1)
    if (storedAction.container_context === newFp.containerContext) {
        score += 1;
    }
    weights += 1;

    // Aria label similarity (weight: 2) - fuzzy match
    if (storedAction.aria_label && newFp.ariaLabel) {
        const labelSim = stringSimilarity(storedAction.aria_label, newFp.ariaLabel);
        score += labelSim * 2;
    } else if (!storedAction.aria_label && !newFp.ariaLabel) {
        score += 1; // Both empty = partial match
    }
    weights += 2;

    return score / weights;
}

/**
 * Simple string similarity using Jaccard index on words.
 */
function stringSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = [...wordsA].filter(x => wordsB.has(x)).length;
    const union = new Set([...wordsA, ...wordsB]).size;

    return union > 0 ? intersection / union : 0;
}

/**
 * Compute a hash representing the current DOM state.
 * Used to detect if we're in the same state as before.
 */
export function computeStateHash(
    url: string,
    elementCount: number,
    pageTitle?: string,
    globalState?: Record<string, string>
): string {
    const safeTitle = (pageTitle || '').trim();

    // V3 Phase 3: Include global state in hash
    let stateStr = '';
    if (globalState && Object.keys(globalState).length > 0) {
        stateStr = JSON.stringify(globalState, Object.keys(globalState).sort());
    }

    const data = `${normalizeUrl(url)}::${elementCount}::${safeTitle}::${stateStr}`;
    return crypto.createHash('md5').update(data).digest('hex');
}
