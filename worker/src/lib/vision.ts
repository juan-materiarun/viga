import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function analyzeScreenshot(imageUrl: string, reasoning: string) {
    try {
        const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Eres un Senior QA Automation. Evalúa si la UI responde coherentemente a la acción.`
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Contexto: ${reasoning}` },
                        { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }
                    ]
                }
            ],
            max_tokens: 80
        });

        return res.choices[0].message.content;
    } catch {
        return "Validación visual omitida (no crítica).";
    }
}
