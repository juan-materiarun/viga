
import { Page, ElementHandle, Locator } from 'playwright';
import { Logger } from './logger';

export interface HealingResult {
    success: boolean;
    element?: Locator;
    method?: 'strict' | 'text_match' | 'role_match' | 'ai_vision';
    reason?: string;
}

export const Healer = {

    /**
     * Tries to find an element using strict selector, then falls back to auto-healing strategies.
     */
    find: async (
        page: Page,
        selector: string | null,
        intent: string,
        suiteId: string
    ): Promise<HealingResult> => {

        // 1. Strict Selector Strategy
        if (selector) {
            try {
                const loc = page.locator(selector).first();
                if (await loc.isVisible({ timeout: 2000 })) {
                    return { success: true, element: loc, method: 'strict' };
                }
            } catch (e) {
                // Ignore and fall through
            }
            Logger.debug(`[HEALER] 🩹 Strict selector '${selector}' failed/not visible. Attempting healing...`, suiteId);
        }

        // 2. Extract semantic meaning from intent
        // Intent usually looks like: "Click Log In", "Type 'foo' in Search", "Submit form"
        const cleanText = intent
            .replace(/click|hacer clic|clic|pulsar|ingresar|escribir|type|fill|select|ir a|navegar a|en el botón|en el campo|press|tap/gi, '')
            .replace(/["']/g, '') // Remove quotes
            .trim();

        if (!cleanText) {
            return { success: false, reason: "No semantic text found in intent to heal with." };
        }

        Logger.debug(`[HEALER] 🚑 Healing target: "${cleanText}"`, suiteId);

        // 3. Text Match Strategy (Fuzzy)
        try {
            const textLoc = page.getByText(cleanText, { exact: false }).first();
            if (await textLoc.isVisible({ timeout: 2000 })) {
                Logger.success(`[HEALER] ✅ Healed by TEXT match: "${cleanText}"`, suiteId);
                return { success: true, element: textLoc, method: 'text_match' };
            }
        } catch (e) { }

        // 4. Role Match Strategy (Button/Link/Input)
        try {
            // Try common roles
            const roles: ('button' | 'link' | 'textbox' | 'checkbox' | 'radio')[] = ['button', 'link', 'textbox'];

            for (const role of roles) {
                const roleLoc = page.getByRole(role, { name: cleanText }).first();
                if (await roleLoc.isVisible({ timeout: 1000 })) {
                    Logger.success(`[HEALER] ✅ Healed by ROLE match: ${role} "${cleanText}"`, suiteId);
                    return { success: true, element: roleLoc, method: 'role_match' };
                }
            }
        } catch (e) { }

        // 5. Placeholder Match (for inputs)
        try {
            const placeholderLoc = page.getByPlaceholder(cleanText, { exact: false }).first();
            if (await placeholderLoc.isVisible({ timeout: 1000 })) {
                Logger.success(`[HEALER] ✅ Healed by PLACEHOLDER match: "${cleanText}"`, suiteId);
                return { success: true, element: placeholderLoc, method: 'text_match' };
            }
        } catch (e) { }

        Logger.warn(`[HEALER] ❌ Failed to heal element for "${intent}"`, suiteId);
        return { success: false, reason: "All healing strategies exhausted." };
    }
};
