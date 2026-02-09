const http = require('http');

http.get('http://localhost:3001/', (res) => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', JSON.stringify(res.headers));

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('BODY LENGTH:', data.length);
        console.log('BODY PREVIEW:', data.slice(0, 500));

        // Scan for keywords indicating a UI
        if (data.includes('<html') || data.includes('<body>')) {
            console.log('✅ HTML UI DETECTED!');
        } else {
            console.log('❌ No HTML detected.');
        }
    });
}).on('error', e => console.error('Error:', e.message));
