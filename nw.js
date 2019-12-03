let Service = require('node-windows').Service;
 
let svc = new Service({
  name: 'serviceprovider',
  description: '', 
  script: require('path').join(__dirname,'client.js'),
  wait: 2,
  grow: .5
});


svc.on('install', () => {
  svc.start();
});

svc.install();
