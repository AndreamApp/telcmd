let Service = require('node-windows').Service;
 
let svc = new Service({
  name: 'Service Provider',
  description: '', 
  script: require('path').join(__dirname,'bg.js'),
  wait: 2,
  grow: .5
});


svc.on('install', () => {
  svc.start();
});

svc.on('uninstall', () => {
  svc.install();
});

svc.install();

