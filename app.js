var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var server = require('socket.io');
var pty = require('pty.js');
var fs = require('fs');

var config = require('./config.json');

var opts = {
    port: config.port,
    sshport: config.sshport,
    sshhost: config.sshhost,
    sshauth: config.sshauth,
    sshuser: config.sshuser
}


process.on('uncaughtException', function(e) {
    console.error('Error: ' + e);
});

var app = express();

app.use('/', express.static(path.join(__dirname, 'public')));


httpserv = http.createServer(app).listen(opts.port, function() {
    console.log('http on port ' + opts.port);
});

var io = server(httpserv,{path: '/wetty/socket.io'});
io.on('connection', function(socket){

    var request = socket.request;
    console.log((new Date()) + ' Connection accepted.');

    var term = pty.spawn('ssh', [opts.sshuser+'@' + opts.sshhost, '-p', opts.sshport, '-o', 'PreferredAuthentications=' + opts.sshauth, '-o', 'KexAlgorithms=+diffie-hellman-group1-sha1'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30
        });

    console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + opts.sshuser)
    term.on('data', function(data) {
        socket.emit('output', data);
    });
    term.on('exit', function(code) {
        console.log((new Date()) + " PID=" + term.pid + " ENDED")
    });
    socket.on('resize', function(data) {
        term.resize(data.col, data.row);
    });
    socket.on('input', function(data) {
        term.write(data);
    });
    socket.on('disconnect', function() {
        term.end();
    });
})
