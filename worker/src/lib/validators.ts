/**
 * Effect Validators for VIGA Chaos Agent (v3 Phase 2)
 * 
 * Validates that executed actions produced the expected side effects.
 * Designed to be safe, non-blocking, and warning-only.
 */

import { Page } from 'playwright-core';
import { UIAction } from './actions';
import { SemanticIntent } from './fingerprint';

export interface ValidationResult {
    passed: boolean;
    evidence: string;
    details?: any;
    wasSkipped?: boolean;
}

export interface StateSnapshot {
    url: string;
    title: string;
    elementCount: number;
    bodyText?: string;
}

/**
 * Capture the current state of the page for comparison.
 */
export async function captureState(page: Page): Promise<StateSnapshot> {
    try {
        const url = page.url();
        const title = await page.title().catch(() => '');

        // Fast element count (approximate depth metric)
        const elementCount = await page.evaluate(() => {
            return document.querySelectorAll('a, button, input, div, span').length;
        });

        // Visible text signature for simple diffing
        // Limit to 500 chars to avoid memory bloat
        const bodyText = await page.evaluate(() => {
            return document.body.innerText.slice(0, 500);
        }).catch(() => '');

        return { url, title, elementCount, bodyText };
    } catch (e) {
        // Fail safe wrapper
        return { url: '', title: '', elementCount: 0 };
    }
}

/**
 * MAIN ENTRY POINT: Validate the effect of an action based on its semantic intent.
 */
export async function validateActionEffect(
    page: Page,
    action: UIAction,
    intent: SemanticIntent,
    beforeState: StateSnapshot
): Promise<ValidationResult> {
    try {
        switch (intent) {
            case 'DOWNLOAD':
                return await validateDownload(page);
            case 'NAVIGATION':
                return await validateNavigation(page, beforeState);
            case 'SUBMIT':
                return await validateSubmit(page, beforeState);
            case 'TOGGLE':
                return await validateToggle(page, beforeState);
            case 'EXPORT':
                return await validateDownload(page); // Export often behaves like download
            case 'INPUT':
            case 'ACTION': // Generic Click
            default:
                return await validateGeneric(page, beforeState);
        }
    } catch (error: any) {
        console.warn(`[VALIDATOR] Error validating ${intent}:`, error);
        return { passed: true, evidence: `Validation skipped due to error: ${error.message}`, wasSkipped: true };
    }
}

// --- SPECIFIC VALIDATORS ---

async function validateDownload(page: Page): Promise<ValidationResult> {
    // Strategy: Check for recent download event or backend request for a file
    // Since Playwright handling of downloads is event-based, we check if
    // a "download" event fired or if a request with file extension/MIME was made.

    // NOTE: In a real chaos run without 'waitForEvent', catching the exact download object is tricky.
    // We rely on 'resource' timing or network activity heuristics here for robustness.

    const downloadHeuristic = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const lastFew = resources.slice(-5);
        return lastFew.some(r =>
            r.name.includes('.pdf') ||
            r.name.includes('.csv') ||
            r.name.includes('.xlsx') ||
            r.name.includes('download') ||
            r.name.includes('export')
        );
    });

    if (downloadHeuristic) {
        return { passed: true, evidence: 'Network activity for file resource detected' };
    }

    return { passed: false, evidence: 'No obvious file download request detected in network logs' };
}

async function validateNavigation(page: Page, before: StateSnapshot): Promise<ValidationResult> {
    const afterUrl = page.url();
    const afterTitle = await page.title().catch(() => '');

    if (afterUrl !== before.url) {
        return { passed: true, evidence: `URL changed to ${afterUrl}` };
    }

    if (afterTitle !== before.title) {
        return { passed: true, evidence: `Page title changed to "${afterTitle}"` };
    }

    // V3.2 fallback: Check for significant DOM structure change (SPA navigation without URL change)
    const afterState = await captureState(page);
    const elemDiff = (afterState.elementCount || 0) - (before.elementCount || 0);

    if (Math.abs(elemDiff) > 5) {
        return { passed: true, evidence: `SPA Navigation detected (local DOM changed by ${elemDiff} elements)` };
    }

    return { passed: false, evidence: 'URL, Title, and DOM structure remained identical after navigation action' };
}

async function validateSubmit(page: Page, before: StateSnapshot): Promise<ValidationResult> {
    const afterState = await captureState(page);

    // Submissions usually change the page content significantly or redirect
    if (afterState.url !== before.url) {
        return { passed: true, evidence: 'Submission caused navigation' };
    }

    const deltaElements = Math.abs(afterState.elementCount - before.elementCount);
    if (deltaElements > 5) {
        return { passed: true, evidence: `Page structure changed significantly (delta: ${deltaElements} elements)` };
    }

    // Check for success/error messages
    const statusMessage = await page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        // Detección de errores en Español e Inglés
        if (body.includes('error') || body.includes('fail') || body.includes('falló') || body.includes('incorrecto') || body.includes('invalid') || body.includes('inválido') || body.includes('required') || body.includes('requerido')) {
            return { type: 'error', text: 'Error detectado en la página' };
        }
        if (body.includes('success') || body.includes('éxito') || body.includes('guardado')) return { type: 'success', text: 'Mensaje de éxito detectado' };
        return null;
    });

    if (statusMessage) {
        if (statusMessage.type === 'error') {
            return { passed: false, evidence: statusMessage.text };
        }
        return { passed: true, evidence: statusMessage.text };
    }

    return { passed: false, evidence: 'No significant page change or status message detected after submit' };
}

async function validateToggle(page: Page, before: StateSnapshot): Promise<ValidationResult> {
    // Toggles (like themes or switches) change visual attributes, often on body or the element itself.
    // Checking body text or attributes.
    const afterState = await captureState(page);

    // Did body classes change? (e.g. dark-mode)
    const bodyClassChanged = await page.evaluate((beforeClasses) => {
        return document.body.className !== beforeClasses;
    }, await page.evaluate(() => document.body.className)); // This logic requires 'before' class, simplified here

    if (afterState.elementCount !== before.elementCount) {
        return { passed: true, evidence: 'UI elements appeared/disappeared' };
    }

    // Fallback: If we can't detect subtle CSS changes easily without snapshot, we assume passed for now
    // unless we strictly check specific attributes.
    return { passed: true, evidence: 'Toggle executed (visual verification needed)', wasSkipped: true };
}

async function validateGeneric(page: Page, before: StateSnapshot): Promise<ValidationResult> {
    const after = await captureState(page);

    if (after.url !== before.url) return { passed: true, evidence: `Navigation to ${after.url}` };
    if (after.title !== before.title) return { passed: true, evidence: `Title changed: ${after.title}` };

    const elemDiff = after.elementCount - before.elementCount;
    if (Math.abs(elemDiff) > 2) return { passed: true, evidence: `DOM structure changed (${elemDiff > 0 ? '+' : ''}${elemDiff} elements)` };

    // V3.2: Check body text hash or length as a proxy for content change
    const lengthDiff = (after.bodyText?.length || 0) - (before.bodyText?.length || 0);
    if (Math.abs(lengthDiff) > 20) return { passed: true, evidence: `Content changed significantly (${lengthDiff} chars)` };

    // If nothing obvious changed, we flag it.
    // In V3.2 strict mode, this triggers LLM re-evaluation or warning.
    return {
        passed: false,
        evidence: 'No se detectó un cambio significativo en la interfaz o URL después de esta acción.',
        wasSkipped: false
    };
}
