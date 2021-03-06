'use strict';


var constraints = {
  video: true,
  audio: true
};
var configOffer = {
  offerToReceiveVideo: false,
  offerToReceiveAudio: false,
  iceRestart: false,
}

var localStream = null;
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var session = null;
var userid = null;
var peerconnection = null;
var remoteStream = null;
var isVideo = false;
var isAudio = false;
var payloadAudio = "111"
var payloadVideo = "97"
var room = ""
var stt = 1
var isOwner = 0;
var server = ""
var version = 0
var port = 0
function stop() {
  $("#callaudio").prop('disabled', false);
  $("#callvideo").prop('disabled', false);
  $("#joinaudio").prop('disabled', false);
  $("#joinvideo").prop('disabled', false);
  if (peerconnection)
    peerconnection.close();
  if (localStream && localStream.getTracks())
    localStream.getTracks().forEach(track => track.stop())
}

function Reset() {
  stop();
  init();
}

function init() {
  getSession();
}
function StopCall() {
  Reset();
}

function Restart() {
  configOffer.iceRestart = true;
  var pcConfig = getConfigPeerConnection()
  if (!pcConfig)
    return;
  peerconnection.setConfiguration(pcConfig)
  if (version == "0") {
    if (isOwner) {
      peerconnection.createOffer(configOffer).then(setLocalAndSendMessage, handleCreateOfferError);
    }
    else {
    }
  }
  else {
    if (isOwner) {
      peerconnection.createOffer(configOffer).then(setLocalAndAddCandidate, handleCreateOfferError);
    }
    else {
      var offer = getOffer(constraints)
      console.log(offer);
      peerconnection.setRemoteDescription(offer)
      peerconnection.createAnswer().then(setLocalAndAddCandidate, handleCreateOfferError);
    }
  }
}

init();
////////////////////////////////////////

var socket = io.connect();

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', { room: room, message: message });
}

socket.on('start', function (message) {
  console.log("bat dau call", isOwner);
  if (isOwner)
    peerconnection.createOffer(configOffer).then(setLocalAndSendMessage, handleCreateOfferError);
});

socket.on('bye', function (message) {
  socket.emit('bye', room)
  Reset()
});

// This client receives a message
socket.on('message', function (message) {
  console.log('Client received message:', message);
  if (message.type === 'offer') {
    peerconnection.setRemoteDescription(new RTCSessionDescription(message));
    peerconnection.createAnswer(configOffer).then(setLocalAndSendMessage, handleCreateOfferError);
  } else if (message.type === 'answer') {
    peerconnection.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    peerconnection.addIceCandidate(candidate);
  }
});

window.onbeforeunload = function () {
  socket.emit("bye", room);
};
/////////////////////////////////////////

function getConfigPeerConnection() {

  var username = "";
  username = version + ":" + isOwner + ":"
  stt = stt + 1

  if (isOwner) {
    room = userid
    username = username + payloadVideo + ":" + payloadAudio + ":" + userid + ":" + session + ":" + room + ":" + stt
  }
  else {
    room = session
    username = username + payloadVideo + ":" + payloadAudio + ":" + session + ":" + userid + ":" + room + ":" + stt
  }


  var pcConfig = {
    'iceServers': [{
      'urls': 'turn:' + server + ":" + port + '?transport=udp',
      "username": username,
      "credential": "123456"
    }]
  };
  return pcConfig;
}


function getConfigPeerConnectionOld() {

  var username = "";
  username = version + ":" + isOwner + ":"
  if (isOwner) {
    room = userid
    username = username + payloadVideo + ":" + payloadAudio + ":" + userid + ":" + session + ":" + room + ":" + stt
  }
  else {
    room = session
    username = username + payloadVideo + ":" + payloadAudio + ":" + session + ":" + userid + ":" + room + ":" + stt
  }
  var pcConfig = {
    'iceServers': [{
      'urls': 'turn:' + server + ":" + port + '?transport=udp',
      "username": username,
      "credential": "123456"
    }]
  };
  return pcConfig;
}

function initCall() {
  session = $("#session").val()
  server = $("#server").val()
  port = $("#port").val()
  version = $("#version").val()
  if (!server || server == "") {
    server = $("#servercb").val()
    if (server == "127.0.0.1" || server == "10.199.213.101")
      port = "3010"
    else
      port = "8010"
  }
  if (!userid || userid == "") {
    alert("Userid chÆ°a cÃ³, vui lÃ²ng reset láº¡i Ä‘á»ƒ láº¥y userid")
    return 0
  }
  if (!server || server == "" || !port || port == "" || parseInt(port) <= 0) {
    alert("KhÃ´ng Ä‘á»ƒ server trá»‘ng")
    return 0
  }
  if (!session || session == "" || parseInt(session) <= 0) {
    alert("KhÃ´ng Ä‘á»ƒ peerID trá»‘ng")
    return 0;
  }
  if (userid == session) {
    alert("KhÃ´ng Ä‘á»ƒ peerID phai khÃ¡c vá»›i userID trá»‘ng")
    return 0
  }
  $("#callaudio").prop('disabled', true);
  $("#callvideo").prop('disabled', true);
  $("#joinaudio").prop('disabled', true);
  $("#joinvideo").prop('disabled', true);
  return 1;


}

function call(isowner, video, audio) {
  isOwner = isowner
  var initcall = initCall();
  if (initcall == 0)
    return
  isVideo = video
  isAudio = audio
  constraints = {
    video: video,
    audio: audio
  };
  configOffer = {
    offerToReceiveVideo: video,
    offerToReceiveAudio: audio,
  }


  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  peerconnection = CreatePeerConnection();
  if (!peerconnection) {
    alert('Cannot create RTCPeerConnection object by config');
    return
  }
  maybeStart();

}
function getSession() {
  // $.get("http://api.conf.talk.zing.vn/genuid", function (res) {
  //   var dataRes = JSON.parse(res)
  //   userid = dataRes.data.id;
  //   $("#session").val(userid);
  //   $("#userid").val(userid)
  // })
  $.get("/genuid", function (res) {
    userid = res.data.id;
    $("#session").val(userid);
    $("#userid").val(userid)
  });
}

function getRTCIceCandidate() {

  var candidateStr = "candidate:23643136 1 udp 41885439 " + server + " " + port + " typ relay raddr 127.0.0.1 rport 51025 generation 0 ufrag " + "local" + stt + " network-id 1"
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: 0,
    candidate: candidateStr
  });
  return candidate;
}
///////////////////////////////////////
function CallAudio() {
  call(/*isOwner=*/1,/*video=*/false,/*audio=*/true)
}
function CallVideo() {
  call(/*isOwner=*/1,/*video=*/true,/*audio=*/true)
}
function JoinAudio() {
  call(/*isOwner=*/0,/*video=*/false,/*audio=*/true)
}
function JoinVideo() {
  call(/*isOwner=*/0,/*video=*/true,/*audio=*/true)
}
function TatAudio() {
  isAudio = false
  Restart();
}
function TatVideo() {
  isVideo = false
  Restart();
}
function CreatePeerConnection() {
  console.log('>>>>>> creating peer connection');

  try {
    var pcConfig = getConfigPeerConnection()
    if (!pcConfig)
      return null;
    var pc = new RTCPeerConnection(pcConfig);
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    pc.onicecandidate = handleIceCandidate;
    pc.addStream(localStream);
    pc.oniceconnectionstatechange = handleIceConnectionStateChange;
    console.log('Created RTCPeerConnnection sessecion');
    return pc;
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
  }
  return null

}
var myVar = null;
function handleIceCandidate(e) {
  if (e.candidate && e.candidate.type == "relay") {
    console.log("handleIceCandidate:", e);
    if (version == "0")
      sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
  }
}
function handleIceConnectionStateChange(e) {
  console.log("change:", e);

  if (e.currentTarget.iceConnectionState == "disconnected") {
    if (myVar == null) {
      Restart()
      myVar = setInterval(function () {
        Restart()
      }, 5000);
    }

  }
  if (e.currentTarget.iceConnectionState == "complete" || e.currentTarget.iceConnectionState == "connected") {
    if (myVar)
      clearInterval(myVar);
  }

}

function maybeStart() {
  if (version == "0") {
    if (isOwner) {
      socket.emit('create', room);
    }
    else {
      socket.emit('join', room);
    }
  }
  else {
    if (isOwner) {
      peerconnection.createOffer(configOffer).then(setLocalAndAddCandidate, handleCreateOfferError);
    }
    else {
      var offer = getOffer(constraints)
      console.log(offer);
      peerconnection.setRemoteDescription(offer)
      peerconnection.createAnswer(configOffer).then(setLocalAndAddCandidate, handleCreateOfferError);
    }
  }

}

/////////////////////////////////////////



function setLocalAndSendMessage(sessionDescription) {
  console.log('Offer sending message', sessionDescription);
  peerconnection.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function setLocalAndAddCandidate(sessionDescription) {
  var sdp = sessionDescription.sdp;
  console.log("setLocalAndAddCandidate: ", sessionDescription)
  var sdpList = sdp.split('\n');
  var res = "";
  var ssrcVideo = ""
  var ssrcVoice = ""
  var ssrcPLI = ""
  var dem = 0
  var oOffer = ""
  var bundle = []
  sdpList.forEach(element => {
    var e = element;
    if (e.indexOf("packetization-mode=0") > 1 && e.indexOf("profile-level-id=42e01f") > 1) {
      var sl = e.split(" ")[0]
      payloadVideo = sl.split(":")[1]
    }
  });

  sdpList.forEach(element => {
      var e = element;
      if (sessionDescription.type == "offer") {
        if (e.startsWith("o=")) {
          oOffer = e.split(" ")[2]
        }
        if (e.startsWith("a=group:BUNDLE"))
          bundle = e.split(" ")
        if (e.startsWith("a=rtpmap:")) {
          if (!e.startsWith("a=rtpmap:" + payloadAudio) && !e.startsWith("a=rtpmap:" + payloadVideo))
            return;
        }
        if (e.startsWith("a=rtcp-fb:")) {
          if (!e.startsWith("a=rtcp-fb:" + payloadAudio) && !e.startsWith("a=rtcp-fb:" + payloadVideo))
            return;
        }
        if (e.startsWith("a=fmtp:")) {
          if (!e.startsWith("a=fmtp:" + payloadAudio) && !e.startsWith("a=fmtp:" + payloadVideo))
            return;
        }
        if (e.startsWith("a=fmtp:" + payloadVideo + " level-asymmetr") && version == "2")
          e = "a=fmtp:" + payloadVideo + " level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA=="
        if (e.startsWith("a=fmtp:" + payloadVideo + " level-asymmetr") && version == "3")
          e = "a=fmtp:" + payloadVideo + " level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oPDf5IQAAAAwBAAK/IA8YMqA==,aM48gA=="

      }
      else {
        if (e.startsWith("a=fmtp:97 level-asymmetr") && version == "2")
          e = "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA=="
        if (e.startsWith("a=fmtp:97 level-asymmetr") && version == "3")
          e = "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oPDf5IQAAAAwBAAK/IA8YMqA==,aM48gA=="
      }
      if (e.startsWith("a=ice-pwd:"))
        e = "a=ice-pwd:asd88fgpdd777uzjYhagZg"
      if (e.startsWith("m=audio"))
        dem = 0
      if (e.startsWith("m=video"))
        dem = 1
      if (e.startsWith("a=ssrc:")) {
        var eS = e.split(" ")[0]
        var s = eS.split(":")[1]
        if (dem == 0)
          ssrcVoice = s
        if (dem == 1) {
          ssrcVideo = s
          dem = 2;
        }
        if (dem == 2) {
          if (s != ssrcVideo) {
            ssrcPLI = s
            dem = 3;
          }
        }
      }
      res = res + e + "\n";
    });
  console.log(ssrcVideo, ssrcVoice)
  if (ssrcVoice != "")
    res = res.replace(new RegExp(ssrcVoice, 'g'), (parseInt(userid) * 2).toString());
  if (ssrcVideo != "")
    res = res.replace(new RegExp(ssrcVideo, 'g'), userid);
  if (ssrcPLI != "")
    res = res.replace(new RegExp(ssrcPLI, 'g'), "456");
  sessionDescription.sdp = res.substr(0, res.length - 1);
  console.log('Offer sending message', sessionDescription);

  peerconnection.setConfiguration(getConfigPeerConnectionOld())

  peerconnection.setLocalDescription(sessionDescription);
  if (sessionDescription.type == "offer") {
    var message = getAnswer(constraints, oOffer, bundle)
    console.log('getAnswer sending message', message);
    peerconnection.setRemoteDescription(new RTCSessionDescription(message))
  }
  peerconnection.addIceCandidate(getRTCIceCandidate());
}


//////////////////////////////////////////

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}
function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}
function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

/////////////////////////////////////////////////////


function getAnswer(type, o, bundle) {
  var sdp = ""
  var sessionVideo = session
  var sessionAudio = (parseInt(session) * 2).toString()
  console.log(type)
  var ps = (version != "2") ? "a=fmtp:" + payloadVideo + " level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n"
    : "a=fmtp:" + payloadVideo + " level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n";
  if (!type || type.audio == true && type.video == true) {

    sdp = "v=0\n"
      + "o=- 1443513048222864666 " + o + " IN IP4 127.0.0.1\n"
      + "s=-\n"
      + "t=0 0\n"
      + "a=group:BUNDLE " + bundle[1] + " " + bundle[2] + "\n"
      + "a=msid-semantic: WMS stream_id\n"
      + "m=audio 9 UDP/TLS/RTP/SAVPF 111\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:local" + stt + "\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
      + "a=setup:active\n"
      + "a=mid:" + bundle[1] + "\n"
      + "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtpmap:111 opus/48000/2\n"
      + "a=rtcp-fb:111 transport-cc\n"
      + "a=fmtp:111 minptime=10;useinbandfec=1\n"
      + "a=ssrc:" + sessionAudio + " cname:f5FD5M4nwcZqWTiQ\n"
      + "a=ssrc:" + sessionAudio + " msid:stream_id video_label\n"
      + "a=ssrc:" + sessionAudio + " mslabel:stream_id\n"
      + "a=ssrc:" + sessionAudio + " label:video_label\n"
      + "m=video 9 UDP/TLS/RTP/SAVPF " + payloadVideo + "\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:local" + stt + "\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
      + "a=setup:active\n"
      + "a=mid:" + bundle[2] + "\n"
      + "a=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtcp-rsize\n"
      + "a=rtpmap:" + payloadVideo + " H264/90000\n"
      + "a=rtcp-fb:" + payloadVideo + " goog-remb\n"
      + "a=rtcp-fb:" + payloadVideo + " transport-cc\n"
      + "a=rtcp-fb:" + payloadVideo + " ccm fir\n"
      + "a=rtcp-fb:" + payloadVideo + " nack\n"
      + "a=rtcp-fb:" + payloadVideo + " nack pli\n"
      + ps
      + "a=ssrc-group:FID " + sessionVideo + " 123\n"
      + "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n"
      + "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n"
      + "a=ssrc:" + sessionVideo + " mslabel:stream_id\n"
      + "a=ssrc:" + sessionVideo + " label:video_label\n"
      + "a=ssrc:" + 123 + " cname:f5FD5M4nwcZqWTiQ\n"
      + "a=ssrc:" + 123 + " msid:stream_id video_label\n"
      + "a=ssrc:" + 123 + " mslabel:stream_id\n"
      + "a=ssrc:" + 123 + " label:video_label\n"
  }
  else
    if (type.video)
      sdp = "v=0\n"
        + "o=- 1443513048222864666 " + o + " IN IP4 127.0.0.1\n"
        + "s=-\n"
        + "t=0 0\n"
        + "a=group:BUNDLE " + bundle[1] + "\n"
        + "a=msid-semantic: WMS stream_id\n"
        + "m=video 9 UDP/TLS/RTP/SAVPF 97\n"
        + "c=IN IP4 0.0.0.0\n"
        + "a=rtcp:9 IN IP4 0.0.0.0\n"
        + "a=ice-ufrag:local" + stt + "\n"
        + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
        + "a=ice-options:trickle\n"
        + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
        + "a=setup:active\n"
        + "a=mid:" + bundle[1] + "\n"
        + "a=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\n"
        + "a=sendrecv\n"
        + "a=rtcp-mux\n"
        + "a=rtcp-rsize\n"
        + "a=rtpmap:97 H264/90000\n"
        + "a=rtcp-fb:97 goog-remb\n"
        + "a=rtcp-fb:97 transport-cc\n"
        + "a=rtcp-fb:97 ccm fir\n"
        + "a=rtcp-fb:97 nack\n"
        + "a=rtcp-fb:97 nack pli\n"
        // + "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n"
        + "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n"
        + "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n"
        + "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n"
        + "a=ssrc:" + sessionVideo + " mslabel:stream_id\n"
        + "a=ssrc:" + sessionVideo + " label:video_label\n"
    else
      if (type.audio)
        sdp = "v=0\n"
          + "o=- 1443513048222864666 " + o + " IN IP4 127.0.0.1\n"
          + "s=-\n"
          + "t=0 0\n"
          + "a=group:BUNDLE " + bundle[1] + "\n"
          + "a=msid-semantic: WMS stream_id\n"
          + "m=audio 9 UDP/TLS/RTP/SAVPF 111\n"
          + "c=IN IP4 0.0.0.0\n"
          + "a=rtcp:9 IN IP4 0.0.0.0\n"
          + "a=ice-ufrag:local" + stt + "\n"
          + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
          + "a=ice-options:trickle\n"
          + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
          + "a=setup:active\n"
          + "a=mid:" + bundle[1] + "\n"
          + "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n"
          + "a=sendrecv\n"
          + "a=rtcp-mux\n"
          + "a=rtpmap:111 opus/48000/2\n"
          + "a=rtcp-fb:111 transport-cc\n"
          + "a=fmtp:111 minptime=10;useinbandfec=1\n"
          + "a=ssrc:" + sessionAudio + " cname:f5FD5M4nwcZqWTiQ\n"
          + "a=ssrc:" + sessionAudio + " msid:stream_id video_label\n"
          + "a=ssrc:" + sessionAudio + " mslabel:stream_id\n"
          + "a=ssrc:" + sessionAudio + " label:video_label\n"
  var message = { sdp: sdp, type: "answer" };
  return message
}


function getOffer(type) {
  var sdp = ""
  var sessionVideo = session
  var sessionAudio = (parseInt(session) * 2).toString()
  console.log(type)
  if (!type || type.audio == true && type.video == true) {

    sdp = "v=0\n"
      + "o=- 1443513048222864666 " + stt + " IN IP4 127.0.0.1\n"
      + "s=-\n"
      + "t=0 0\n"
      + "a=group:BUNDLE audio video\n"
      + "a=msid-semantic: WMS stream_id\n"
      + "m=audio 9 UDP/TLS/RTP/SAVPF 111\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:local" + stt + "\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
      + "a=setup:actpass\n"
      + "a=mid:audio\n"
      + "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtpmap:111 opus/48000/2\n"
      + "a=rtcp-fb:111 transport-cc\n"
      + "a=fmtp:111 minptime=10;useinbandfec=1\n"
      + "a=ssrc:" + sessionAudio + " cname:f5FD5M4nwcZqWTiQ\n"
      + "a=ssrc:" + sessionAudio + " msid:stream_id video_label\n"
      + "a=ssrc:" + sessionAudio + " mslabel:stream_id\n"
      + "a=ssrc:" + sessionAudio + " label:video_label\n"
      + "m=video 9 UDP/TLS/RTP/SAVPF 97 107\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:local" + stt + "\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
      + "a=setup:active\n"
      + "a=mid:video\n"
      + "a=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtcp-rsize\n"
      + "a=rtpmap:97 H264/90000\n"
      + "a=rtcp-fb:97 goog-remb\n"
      + "a=rtcp-fb:97 transport-cc\n"
      + "a=rtcp-fb:97 ccm fir\n"
      + "a=rtcp-fb:97 nack\n"
      + "a=rtcp-fb:97 nack pli\n"
      // + "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n"
      + "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n"
      + "a=rtpmap:107 rtx/90000\n"
      + "a=fmtp:107 apt=97\n"
      + "a=ssrc-group:FID " + sessionVideo + " 123\n"
      + "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n"
      + "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n"
      + "a=ssrc:" + sessionVideo + " mslabel:stream_id\n"
      + "a=ssrc:" + sessionVideo + " label:video_label\n"
      + "a=ssrc:" + 123 + " cname:f5FD5M4nwcZqWTiQ\n"
      + "a=ssrc:" + 123 + " msid:stream_id video_label\n"
      + "a=ssrc:" + 123 + " mslabel:stream_id\n"
      + "a=ssrc:" + 123 + " label:video_label\n"
  }
  else
    if (type.video)
      sdp = "v=0\n"
        + "o=- 1443513048222864666 " + stt + " IN IP4 127.0.0.1\n"
        + "s=-\n"
        + "t=0 0\n"
        + "a=group:BUNDLE video\n"
        + "a=msid-semantic: WMS stream_id\n"
        + "m=video 9 UDP/TLS/RTP/SAVPF 97\n"
        + "c=IN IP4 0.0.0.0\n"
        + "a=rtcp:9 IN IP4 0.0.0.0\n"
        + "a=ice-ufrag:local" + stt + "\n"
        + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
        + "a=ice-options:trickle\n"
        + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
        + "a=setup:actpass\n"
        + "a=mid:video\n"
        + "a=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\n"
        + "a=sendrecv\n"
        + "a=rtcp-mux\n"
        + "a=rtcp-rsize\n"
        + "a=rtpmap:97 H264/90000\n"
        + "a=rtcp-fb:97 goog-remb\n"
        + "a=rtcp-fb:97 transport-cc\n"
        + "a=rtcp-fb:97 ccm fir\n"
        + "a=rtcp-fb:97 nack\n"
        + "a=rtcp-fb:97 nack pli\n"
        // + "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n"
        + "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n"
        + "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n"
        + "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n"
        + "a=ssrc:" + sessionVideo + " mslabel:stream_id\n"
        + "a=ssrc:" + sessionVideo + " label:video_label\n"
    else


      if (type.audio)
        sdp = "v=0\n"
          + "o=- 1443513048222864666 " + stt + " IN IP4 127.0.0.1\n"
          + "s=-\n"
          + "t=0 0\n"
          + "a=group:BUNDLE audio\n"
          + "a=msid-semantic: WMS stream_id\n"
          + "m=audio 9 UDP/TLS/RTP/SAVPF 111\n"
          + "c=IN IP4 0.0.0.0\n"
          + "a=rtcp:9 IN IP4 0.0.0.0\n"
          + "a=ice-ufrag:local" + stt + "\n"
          + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
          + "a=ice-options:trickle\n"
          + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
          + "a=setup:actpass\n"
          + "a=mid:audio\n"
          + "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n"
          + "a=sendrecv\n"
          + "a=rtcp-mux\n"
          + "a=rtpmap:111 opus/48000/2\n"
          + "a=rtcp-fb:111 transport-cc\n"
          + "a=fmtp:111 minptime=10;useinbandfec=1\n"
          + "a=rtcp-fb:111 ccm fir\n"
          + "a=rtcp-fb:111 nack\n"
          + "a=rtcp-fb:111 nack pli\n"

          + "a=ssrc:" + sessionAudio + " cname:f5FD5M4nwcZqWTiQ\n"
          + "a=ssrc:" + sessionAudio + " msid:stream_id video_label\n"
          + "a=ssrc:" + sessionAudio + " mslabel:stream_id\n"
          + "a=ssrc:" + sessionAudio + " label:video_label\n"
  var message = { sdp: sdp, type: "offer" };
  return message
}


function getStats(pc) {
  var rest = 0;
  window.setInterval(function () {
    pc.getStats(null).then(stats => {
      let statsOutput = "";
      for (var report in stats) {
        statsOutput += `<h2>Report: ${report.type}</h3>\n<strong>ID:</strong> ${report.id}<br>\n` +
          `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;
        console.log(report, statsOutput);
        // Now the statistics for this report; we intentially drop the ones we
        // sorted to the top above

        // Object.keys(report).forEach(statName => {
        //   if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
        //     statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
        //     console.log(statsOutput)
        //   }
        // });
      }
    });

  }, 1000);
}