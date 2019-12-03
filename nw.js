let Service = require('node-windows').Service;
 
let svc = new Service({
  name: 'serviceprovider',
  description: '', 
  script: require('path').join(__dirname,'client.js')
});
 
svc.on('install', () => {
  svc.start();
});

svc.install();
