'use strict';


////////////////////////////////////////

var socket = io.connect();

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', { room: room, message: message });
}
socket.on('bye', function (message) {
  socket.emit('bye', room)
  Reset()
});

socket.on('listuid', function (data) {
  var keys = data.keys;
  for (var i in data) {
    var peerId = data[i].userid;
  }
});


socket.on('user_join', function (peerId) {
  console.log('user_join:', peerId);
});


// window.onbeforeunload = function () {
//   socket.emit("bye", { room: room, userid: userid });
// };
/////////////////////////////////////////
function JoinAudio() {
  Join();
} 
function JoinVideo() {
  Join();
}

function Join() {
  var room=$("#room").val();
  var userid=$("#userid").val();
  socket.emit('join', { room: room, userid: userid });
}