/**
 * Transforms a list of VIGA Chaos steps into a fully executable Playwright test script.
 */
export function generatePlaywrightCode(steps: any[], startUrl: string): string {
    const lines: string[] = [];

    // Header
    lines.push(`import { test, expect } from '@playwright/test';`);
    lines.push(``);
    lines.push(`test('VIGA Auto-Generated Chaos Test', async ({ page }) => {`);
    lines.push(`    // 🚀 Start URL`);
    lines.push(`    await page.goto('${startUrl}');`);
    lines.push(``);

    // Body
    for (const step of steps) {
        if (!step.action_data) continue;

        const { actionType, selector, payload, actionId } = step.action_data;
        const title = step.title || 'Unknown Action';

        lines.push(`    // 📍 ${title}`);

        try {
            if (actionType === 'navigate') {
                // Navigation is usually implicit, but if we have explicit navigation actions:
                if (payload) lines.push(`    await page.goto('${payload}');`);
            } else if (actionType === 'click') {
                lines.push(`    await page.click('${selector}');`);
            } else if (actionType === 'type') {
                lines.push(`    await page.fill('${selector}', '${payload || ''}');`);
            }

            // Add implicit wait/check based on success
            if (step.status === 'success') {
                // Could add assertions here if we had detailed evidence
                lines.push(`    // ✅ Step succeeded`);
            }
        } catch (e) {
            lines.push(`    // ⚠️ Error generating code for step: ${title}`);
        }
        lines.push(``);
    }

    // Footer
    lines.push(`});`);

    return lines.join('\n');
}

/**
 * Generates a full Playwright Test Suite with multiple test cases (Journeys).
 * Used by Atlas to compile all verified journeys into a single file.
 */
export function generatePlaywrightSuite(
    suiteName: string,
    startUrl: string,
    testCases: { title: string; steps: any[] }[]
): string {
    const lines: string[] = [];

    // Header
    lines.push(`import { test, expect } from '@playwright/test';`);
    lines.push(``);
    lines.push(`test.describe('${suiteName}', () => {`);
    lines.push(``);
    lines.push(`    test.beforeEach(async ({ page }) => {`);
    lines.push(`        await page.goto('${startUrl}');`);
    lines.push(`    });`);
    lines.push(``);

    // Test Cases
    for (const testCase of testCases) {
        // Sanitize title for test name
        const safeTitle = testCase.title.replace(/['"]/g, "");
        lines.push(`    test('${safeTitle}', async ({ page }) => {`);

        for (const step of testCase.steps) {
            if (!step.ui_actions && !step.ui_locators && !step.action_type) continue;

            const actionType = step.action_type;
            const payload = step.payload;
            const stepTitle = step.title || step.intent || 'Unknown Action';

            // Try to get selector from various sources (Atlas format)
            let selector = '';
            if (step.ui_actions?.selectors?.[0]) selector = step.ui_actions.selectors[0];
            else if (step.ui_locators?.selectors?.css) selector = step.ui_locators.selectors.css;

            lines.push(`        // 📍 ${stepTitle}`);

            try {
                if (actionType === 'navigate' && payload) {
                    lines.push(`        await page.goto('${payload}');`);
                } else if (selector) {
                    if (actionType === 'click') {
                        lines.push(`        await page.click('${selector}');`);
                    } else if (actionType === 'fill' || actionType === 'type') {
                        lines.push(`        await page.fill('${selector}', '${payload || ''}');`);
                    }
                } else {
                    // Fallback for smart actions if no selector (Text based)
                    const cleanText = stepTitle.replace(/click|hacer clic|clic|pulsar|ingresar|escribir|type|fill|select|ir a|navegar a|en el botón|en el campo/gi, '').trim();
                    if (cleanText) {
                        if (actionType === 'click') {
                            lines.push(`        await page.getByText('${cleanText}', { exact: false }).first().click();`);
                        }
                    }
                }

                // Assertions (The Judge)
                if (step.expected_result && !step.expected_result.includes('Failed')) {
                    lines.push(`        // 🔍 Expect: ${step.expected_result}`);
                }

            } catch (e) {
                lines.push(`        // ⚠️ Error generating step: ${stepTitle}`);
            }
            lines.push(``);
        }
        lines.push(`    });`);
        lines.push(``);
    }

    lines.push(`});`);

    return lines.join('\n');
}
