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
    // isInitiator = true;
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

function sendMessage(room, message) {
    console.log('Client sending message: ', message);
    socket.emit('message', { room: room, message: message });
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


isChannelReady = true;
isStarted = false
isInitiator = false

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
    sendMessage(room, 'got user media');
    if (isInitiator) {
        maybeStart();
    }
    else
        maybeStart();

}

var constraints = {
    video: true,
    audio: false
};

function maybeStart() {
    console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
        console.log('>>>>>> creating peer connection');
        createPeerConnection();
        pc.addStream(localStream);
        pcTest.addStream(localStream);
        doCall()

        isStarted = true;
        console.log('isInitiator', isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

window.onbeforeunload = function () {
    sendMessage(room, 'bye');
};


var lh = '127.0.0.1';
// var lh = '172.24.28.176';
/////////////////////////////////////////////////////////
var pcConfig = {
    'iceServers': [{
        // 'urls': 'turn:10.30.80.62:3010?transport=udp',
        'urls': 'turn:' + lh + ':3010?transport=udp',
        // 'urls': 'turn:192.168.1.242:3010?transport=udp',
        "username": "thaonk",
        "credential": "123456"
    }]
};

function createPeerConnection() {
    try {
        pcConfig.iceServers[0].username = '10thaonk' + room;
        console.log(pcConfig.iceServers[0]);
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        pcConfig.iceServers[0].username = '00thaonk1';
        console.log(pcConfig.iceServers[0]);

        pcTest = new RTCPeerConnection(pcConfig);

        // getStats(pc);
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
        sendMessage(room, {
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
    pcTest.createOffer(constraints).then(setLocalAndSendMessageTest, handleCreateOfferError);
}
function restart() {
    offerOptions.iceRestart = true;
    pc.createOffer(offerOptions).then(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer(constraints).then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}
var pcTest;


function setLocalAndSendMessageTest(sessionDescription) {
    var sdp = sessionDescription.sdp;
    var sdpList = sdp.split('\n');
    var usr = "";
    var res = "";
    sdpList.forEach(element => {
        var e = element;
        if (e.startsWith("a=ice-ufrag:"))
            e = "a=ice-ufrag:local"
        if (e.startsWith("a=ice-pwd:"))
            e = "a=ice-pwd:asd88fgpdd777uzjYhagZg"
        if (e.startsWith("a=fingerprint"))
            e = "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05";
        res = res + e + "\n";
    });
    res = res.substr(0, res.length - 1);
    sessionDescription.sdp = res;
    pc.setRemoteDescription(sessionDescription);

    doAnswer()

}

function setLocalAndSendMessage(sessionDescription) {
    var sdp = sessionDescription.sdp;
    var sdpList = sdp.split('\n');
    var usr = "";
    var res = "";
    sdpList.forEach(element => {
        var e = element;
        if (e.startsWith("a=ice-ufrag:"))
            e = "a=ice-ufrag:remote"
        if (e.startsWith("a=ice-pwd:"))
            e = "a=ice-pwd:asd88fgpdd777uzjYhagZg"
        res = res + e + "\n";
    });
    res = res.substr(0, res.length - 1);
    sessionDescription.sdp = res;
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    pc.setLocalDescription(sessionDescription);

    var candidateStr = "candidate:23643136 1 udp 41885439 " + lh + " 3010 typ relay raddr 127.0.0.1 rport 51025 generation 0 ufrag local network-id 1"
    console.log(candidateStr);
    //candidate:23643136 1 udp 41819903 172.24.28.176 3010 typ relay raddr 172.24.28.176 rport 51403 generation 1 ufrag AYH5 network-id 2 network-cost 10
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: 0,
        candidate: candidateStr
    });
    pc.addIceCandidate(candidate);

    // sendMessage(room, sessionDescription);
}
function onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
}
function onCreateSessionDescriptionErrorTest(error) {
    console.log('Failed Test to create session description: ' + error.toString());
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
    sendMessage(room, 'bye');
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