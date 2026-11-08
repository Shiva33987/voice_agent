const http = require('http');

function get(url) {
  http.get(url, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Redirect to:', res.headers.location);
      get('http://localhost:3010' + res.headers.location);
      return;
    }
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Final length:', data.length);
      const terms = ['data-slot="sidebar"', 'data-sidebar', 'app-sidebar-dock', 'aside', 'Voice Agents'];
      for (const t of terms) {
        console.log(t, '-->', data.includes(t));
      }
      let idx = data.indexOf('app-sidebar-dock');
      if (idx !== -1) {
        console.log(data.substring(idx - 100, idx + 200));
      }
    });
  });
}
get('http://localhost:3010/workflow');

