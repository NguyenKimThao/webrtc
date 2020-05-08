'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
var express = require('express');
var https = require('https');
var fs = require('fs');
const bodyParser = require('body-parser')

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
appHttp.setTimeout(500000);

app.use(
  bodyParser.urlencoded({
    extended: true
  })
)

app.use(bodyParser.json())
// var appHttps = https.createServer(options, function (req, res) {
//   fileServer.serve(req, res);
// }).listen(port);
function getUid() {
  id = id + 1
  return id + 10;
}

app.use("/genuid", function (rep, res) {
  res.json({ "err": 0, "data": { "id": getUid() } })
})


var io = socketIO.listen(appHttp);

io.sockets.on('connection', function (socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function (data) {
    log('Client said: ', data.message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.to(data.room).emit('message', data.message);
  });

  socket.on('create', function (room) {
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    console.log("co user tao phong:", room, " slht:", numClients)
    socket.join(room);
    if (numClients == 1) {
      console.log("bat dau phong:", room)
      socket.emit('start');
    }
  });

  socket.on('join', function (room) {
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    console.log("co user tham gia phong:", room, " slht:", numClients)
    socket.join(room);
    if (numClients == 1) {
      console.log("bat dau phong:", room)
      io.sockets.in(room).emit('start');
    }
  });

  socket.on('bye', function (room) {
    console.log('received bye');
    io.sockets.in(room).emit('bye');
    socket.leave(room)
  });

});

var userPc = {};
var roomPC = {};
function getRoom(rid) {
  if (roomPC[rid] == null) {
    roomPC[rid] = {};
  }
  return roomPC[rid];
}

function getStringRoom(rid) {
  var res = "";
  var room = getRoom(rid);
  for (var i in room) {
    res += room[i].strRoom;
  }
  return res;
}
function addUser(uid, rid, res) {
  var strUid = uid + "," + uid + ",1\n";
  var room = getRoom(rid);
  var info = {};
  info.uid = uid;
  info.room = rid;
  info.strRoom = strUid;
  info.res = res;
  info.pendding = false;
  room[uid] = info;
}
function removeUser(uid, rid) {
  var strUid = uid + "," + uid + ",0\n";
  var room = getRoom(rid);
  if (room[rid])
    delete room[rid];
  return strUid;
}

function send(uid, peer_id, data) {
  if (!data)
    return
  if (!userPc[peer_id] || !userPc[peer_id].room)
    return;
  var room = getRoom(userPc[peer_id].room)
  if (!room[peer_id] | !room[peer_id].pendding)
    return;
  var resPeer = room[peer_id].res;
  resPeer.header("Pragma", uid);
  resPeer.send(data);
  room[peer_id].pendding = false;
}
app.use('/sign_in', function (req, res) {
  if (!req.query.room)
    return res.send('');
  var uid = getUid();
  var rid = req.query.room;
  addUser(uid, rid, res);
  var room = getRoom(rid);
  var strRoom = getStringRoom(rid);
  for (var i in room) {
    if (uid != room[i].uid && room[i].pendding) {
      var resPeer = room[i].res;
      resPeer.header("Pragma", room[i].uid);
      resPeer.send(room[uid].strRoom);
      room[i].pendding = false;
    }
  }
  userPc[uid] = { uid: uid, room: rid, status: 0 };
  res.header("Pragma", uid);
  res.send(strRoom);

});

app.use('/wait', function (req, res) {
  if (!req.query.peer_id)
    return res.send('');
  var uid = req.query.peer_id;
  if (!userPc[uid] || !userPc[uid].room)
    return res.send('');
  var room = getRoom(userPc[uid].room)
  if (!room[uid] | room[uid].pendding)
    return res.send('');
  req.setTimeout(500000)
  room[uid].res = res;
  room[uid].pendding = true;
});
app.post("/message", function (req, res) {
  if (!req.query.peer_id || !req.query.to)
    return res.send('');
  var uid = req.query.peer_id;
  var peer_id = req.query.to;
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    send(uid, peer_id, body);
    res.send("");
  });
})
app.use('/clear', function (req, res) {
  userPc = {};
  roomPC = {};
})

app.use('/sign_out', function (req, res) {
  if (!req.query.peer_id)
    return res.send('');
  var uid = req.query.peer_id;
  if (!userPc[uid] || !userPc[uid].room)
    return res.send('');
  var strRemove = removeUser(uid, userPc[uid].room)
  for (var i in room) {
    if (uid != room[i].uid && room[i].pendding) {
      var resPeer = room[i].res;
      resPeer.header("Pragma", room[i].uid);
      resPeer.send(strRemove);
      room[i].pendding = false;
    }
  }
  res.send("");
});

app.use("/", function (req, res) {
  res.sendfile("./public/index.html");
})
