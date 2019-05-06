'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};
/////////////////////////////////////////////

var room = 'foo';
// Could prompt for room name:
room = prompt('Enter room name:');

var socket = io.connect();

socket.on('created', function (room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function (room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room) {
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function (room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function (array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}


// This client receives a message
socket.on('message', function (message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: false
}).then(gotStream)
  .catch(function (e) {
    alert('getUserMedia() error: ' + e.name + '\n' + e.message);
  });

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  video: true,
  audio: false
};
// isChannelReady=true;
// isStarted=false
function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function () {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////
var pcConfig = {
  'iceServers': [{
    // 'urls': 'turn:10.30.80.62:3010?transport=udp',
    'urls': 'turn:172.24.28.176:3010?transport=udp',
    "username": "thaonk",
    "credential": "123456"
  }]
};


function createPeerConnection() {
  try {
    if (isInitiator) {
      pcConfig.iceServers[0].username = '0thaonk' + room;
    } else {
      pcConfig.iceServers[0].username = '1thaonk' + room;
    }
    console.log(pcConfig.iceServers[0]);
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    getStats(pc);
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate && event.candidate.type == 'relay') {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(constraints).then(setLocalAndSendMessage, handleCreateOfferError);
}
function restart() {
  offerOptions.iceRestart = true;
  pc.createOffer(offerOptions).then(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  // var sdp = sessionDescription.sdp;
  // var sdpList = sdp.split('\n');
  // var res = "";
  // sdpList.forEach(element => {
  //   // if (element.startsWith("m=audio"))
  //   // element = "m=audio 9 UDP/TLS/RTP/SAVPF 111"
  //   // if (element.startsWith("m=video")) {
  //   //   element = "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 123 127 122 125 107 108 109 124"
  //   // }
  //   res = res + element + "\n";
  // });
  // res = res.substr(0, res.length - 1);

  // // for(var i =0 ;i<sdpList.length;i++);
  // // {
  // //   var l=sdpList.indexOf(i);
  // //   console.log(sdpList.indexOf(i));
  // //   if(l.startsWith("m=audio"))
  // //     l="m=audio 9 UDP/TLS/RTP/SAVPF 111"

  // //   res=res+l+"\n";
  // // }
  // // console.log("res",res);
  // console.log('setLocalAndSendMessage sending message', sessionDescription);
  // sessionDescription.sdp = res;
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
function getStats(pc) {
  var rest = 0;
  window.setInterval(function () {
    // console.log(pc.getSenders())
    // var sender = pc.getSenders();
    // sender.forEach(s => {
    //   s.getStats().then(function (stats) {
    //     stats.forEach(report => {
    //       console.log(report);
    //     });
    //   });
    // });
    var demStats = 0

    pc.getStats(null).then(stats => {
      let statsOutput = "";
      for (var report in stats) {
        demStats++;
        statsOutput += `<h2>Report: ${report.type}</h3>\n<strong>ID:</strong> ${report.id}<br>\n` +
          `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;
        // console.log(report);
        // Now the statistics for this report; we intentially drop the ones we
        // sorted to the top above

        // Object.keys(report).forEach(statName => {
        //   if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
        //     statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
        //   }
        // });
      }
    });

    if (demStats == 0)
      rest++;
    else
      rest = 0;
    if (rest == 5) {
      rest = 0;
      // restart();
    }

  }, 1000);
}