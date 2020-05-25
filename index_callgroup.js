'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
var express = require('express');
var https = require('https');
var fs = require('fs');
var id = 0
// This line is from the Node.js HTTPS documentation.
var options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

var port = process.env.PORT || 8080;
var fileServer = new (nodeStatic.Server)();


var app = express();
app.use(express.static("public"));
var appHttp = http.Server(app).listen(port);
var appHttps = https.createServer(options, app).listen(443);

app.use("/genuid", function (rep, res) {
  id = id + 1
  res.json({ "err": 0, "data": { "id": id + 10 } })
})

app.use("/manager", function (rep, res) {
  res.sendfile("./public/callgroup_manager.html");
})
app.use("/", function (rep, res) {
  res.sendfile("./public/index_callgroup.html");
})

// var io = socketIO.listen(appHttp);
var io = new socketIO();
io.attach(appHttp);
io.attach(appHttps);

var roomManager = {};
var socketMenager = {};
io.sockets.on('connection', function (socket) {

  socket.on('join', function (data) {
    if (!roomManager[data.room]) {
      roomManager[data.room] = {};
    }
    roomManager[data.room][data.room] = { userid: data.room, video:true, audio:true };

    var room = roomManager[data.room];
    console.log("co user tham gia phong:", data.room, " slht:", room, " userid:", data.userid)
    console.log(room);
    socket.emit('listuid', room);
    room[data.userid] = { userid: data.userid, audio:data.audio, video: data.video };
    io.sockets.in(room).emit('user_join', room);
    socket.join(room);
    socketMenager[data.userid] = socket;
  });

  socket.on('candidate', function (data) {
    if (!roomManager[data.room] || !socketMenager[data.peerId]) {
      return;
    }
    console.log('candidate:', data);
    var room = roomManager[data.room];
    // socket.broadcast.to(data.room).emit('candidate', data);
    socketMenager[data.peerId].emit('candidate', data);
  });


  socket.on('bye', function (data) {
    // console.log('received bye');
    // io.sockets.in(data.room).emit('bye');
    socket.leave(data.room)
    var room = roomManager[data.room];
    delete data[data.userid]
    delete socketMenager[data.userid];
  });

});
