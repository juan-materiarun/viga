const http = require('http');

const url = 'http://localhost:3001/json/list';

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('--- RAW JSON RESPONSE ---');
            console.log(JSON.stringify(json, null, 2));

            if (json.length > 0) {
                console.log('\n--- TARGET INFO ---');
                const target = json[0];
                console.log('ID:', target.id);
                console.log('Type:', target.type);
                console.log('Original WebSocket URL:', target.webSocketDebuggerUrl);
                console.log('DevTools URL:', target.devtoolsFrontendUrl);

                // Simplified connectivity check suggestion
                console.log('\n--- SUGGESTED TEST ---');
                console.log(`Try run: wscat -c "ws://localhost:3001/devtools/page/${target.id}"`);
            } else {
                console.log('No active sessions found.');
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw Data:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error fetching URL:', err.message);
});
