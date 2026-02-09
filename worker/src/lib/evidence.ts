import { supabase } from './supabase';

export async function captureEvidence(page: any, suiteId: string, stepId: string, isError: boolean = false): Promise<{ screenshotUrl: string, domSnapshot?: string }> {
    try {
        const timestamp = Date.now();
        const screenshotBuffer = await page.screenshot({
            fullPage: false,
            quality: 60,
            type: 'jpeg'
        });

        const path = `${suiteId}/${stepId}_${timestamp}${isError ? '_error' : ''}.jpg`;

        const { error } = await supabase.storage
            .from('evidence')
            .upload(path, screenshotBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) {
            console.error('[EVIDENCE] Upload failed:', error.message);
            return { screenshotUrl: '' };
        }

        const { data } = supabase.storage
            .from('evidence')
            .getPublicUrl(path);

        return { screenshotUrl: data.publicUrl };

    } catch (e: any) {
        console.error('[EVIDENCE] Capture failed:', e.message);
        return { screenshotUrl: '' };
    }
}
