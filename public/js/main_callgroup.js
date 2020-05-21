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
var room = ""
var stt = 1
var server = ""
var port = 0
var version = "0.0.0"
var roomManager = {};

function stop() {
  $("#joinaudio").prop('disabled', false);
  $("#joinvideo").prop('disabled', false);
  $("#joincall").prop('disabled', false);
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

function Restart() {

}

init();
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
    JoinMeeting(peerId);
  }
});


socket.on('user_join', function (peerId) {
  console.log('user_join:', peerId);
  JoinMeeting(peerId);
});
socket.on('candidate', function (data) {
  if (data.peerId != userid)
    return;
  console.log('candidate:', data);
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: 0,
    candidate: data.candidate
  });
  var pc = getPeerConnection(data.userId);
  if (pc == null)
    return;
  pc.addIceCandidate(candidate)
});



window.onbeforeunload = function () {
  socket.emit("bye", { room: room, userid: userid });
};
/////////////////////////////////////////

function getConfigPeerConnection(peerId) {

  var username = room + ":" + userid + ":" + peerId + ":" + session;

  var pcConfig = {
    'iceServers': [
      //   {
      //   'urls': 'turn:' + server + ":" + port + '?transport=udp',
      //   "username": username,
      //   "credential": "123456"
      // }
    ]
  };
  return pcConfig;
}

function initCall() {
  room = $("#room").val();
  session = room;
  server = $("#server").val()
  port = $("#port").val()
  version = $("#version").val()
  if (!server || server == "") {
    server = $("#servercb").val()
    if (server == "127.0.0.1" || server == "10.199.213.101")
      port = "3010"
    else if (server == "222.255.216.226")
      port = "8110"
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
  if (!room || room == "" || parseInt(room) <= 0) {
    alert("KhÃ´ng Ä‘á»ƒ room trá»‘ng")
    return 0;
  }
  // if (userid == session) {
  //   alert("KhÃ´ng Ä‘á»ƒ roomID phai khÃ¡c vá»›i userID trá»‘ng")
  //   return 0
  // }
  $("#joinaudio").prop('disabled', true);
  $("#joinvideo").prop('disabled', true);
  $("#joincall").prop('disabled', true);
  return 1;


}

function call(video, audio) {
  var initcall = initCall();
  if (initcall == 0)
    return

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
  socket.emit('join', { room: room, userid: userid });
}

function MuteAudio() {
    console.log(localVideo.muted);
    if (localVideo.muted)
        localVideo.muted = false;
    else
        localVideo.muted = true;
}

function OnOffVideo() {
    console.log(localVideo);
    // if(localVideo.pause)
    // localVideo.pause = false;
    // else 
    // localVideo.pause=true;
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
    // $("#room").val(userid);
    $("#room").val(1);
    $("#userid").val(userid)
  });
}

function getPeerConnection(peerId) {
  return roomManager[peerId] ? roomManager[peerId].pc : null;
}

function getRTCIceCandidate() {
  var candidateStr = "candidate:23643136 1 udp 41885439 " + server + " " + port + " typ relay raddr 127.0.0.1 rport 51025 generation 0 ufrag room" + room + " network-id 1"
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: 0,
    candidate: candidateStr
  });
  return candidate;
}
///////////////////////////////////////
function JoinAudio() {
  call(/*video=*/false,/*audio=*/true)
}
function JoinVideo() {
  call(/*video=*/true,/*audio=*/false)
}
function JoinCall() {
  call(/*video=*/true,/*audio=*/true)
}
// function TatAudio() {
//   isAudio = false
//   Restart();
// }
// function TatVideo() {
//   isVideo = false
//   Restart();
// }

function JoinMeeting(peerId) {
    if (userid == peerId || roomManager[peerId] != null) {
        console.log('da ton tai');
        return false;
    }
  var roomPeer = CreatePeerConnection(peerId);
  if (roomPeer == null)
    return false;
  roomManager[peerId] = roomPeer;
  maybeStart(peerId);
}

function CreatePeerConnection(peerId) {
  console.log('>>>>>> creating peer connection');

  try {
    var roomPeer = { id: peerId };
    var pcConfig = getConfigPeerConnection(roomPeer.id)
    if (!pcConfig)
      return null;
    var pc = new RTCPeerConnection(pcConfig);
    pc.onaddstream = function (event) {
      console.log('Remote stream added by peerId:' + roomPeer.id);
      roomPeer.remoteStream = event.stream;
      $("#videos").append('<video id="remoteVideo' + roomPeer.id + '" autoplay playsinline></video>');
      roomPeer.remoteVideo = document.querySelector('#remoteVideo' + roomPeer.id);
      roomPeer.remoteVideo.srcObject = roomPeer.remoteStream;
    };
    pc.onremovestream = function (event) {
      console.log('Remote stream remove by peerId:' + roomPeer.id);
    };
    pc.onicecandidate = function (e) {
      // console.log("handleIceCandidate:", e);
      // if (e.candidate /*&& e.candidate.type == "relay"*/) {
      //   socket.emit('candidate', {
      //     type: 'candidate',
      //     label: event.candidate.sdpMLineIndex,
      //     id: event.candidate.sdpMid,
      //     candidate: event.candidate.candidate,
      //     peerId: roomPeer.id,
      //     userId: userid,
      //     room: room
      //   })
      // }
    };
    pc.addStream(localStream);
    roomPeer.pc = pc;
    // pc.oniceconnectionstatechange = handleIceConnectionStateChange;
    console.log('Created RTCPeerConnnection sessecion');
    return roomPeer;
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
  }
  return null

}

// var myVar = null;
// function handleIceCandidate(e) {
//   if (e.candidate && e.candidate.type == "relay") {
//     console.log("handleIceCandidate:", e);
//     if (version == "0")
//       sendMessage({
//         type: 'candidate',
//         label: event.candidate.sdpMLineIndex,
//         id: event.candidate.sdpMid,
//         candidate: event.candidate.candidate
//       });
//   }
// }
// function handleIceConnectionStateChange(e) {
//   console.log("change:", e);

//   if (e.currentTarget.iceConnectionState == "disconnected") {
//     if (myVar == null) {
//       Restart()
//       myVar = setInterval(function () {
//         Restart()
//       }, 5000);
//     }

//   }
//   if (e.currentTarget.iceConnectionState == "complete" || e.currentTarget.iceConnectionState == "connected") {
//     if (myVar)
//       clearInterval(myVar);
//   }

// }

function maybeStart(peerId) {
  var offer = getOffer(constraints, peerId)
  console.log(offer);
  var peerconnection = getPeerConnection(peerId);
  peerconnection.setRemoteDescription(offer)
  peerconnection.createAnswer().then(function (sessionDescription) {
    setLocalAndAddCandidate(peerId, sessionDescription);
  });
}

/////////////////////////////////////////


function setLocalAndAddCandidate(peerId, sessionDescription) {
  var peerconnection = getPeerConnection(peerId);
  var sdp = sessionDescription.sdp;
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
    if (e.startsWith("a=ice-ufrag"))
      e = "a=ice-ufrag:" + userid + "_" + peerId;
	if (e.startsWith("a=fmtp:97 level-asymmetr"))
            e = "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA=="
    // if(e.startsWith("a=fingerprint"))
    //   e = "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05"
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

  if (ssrcVoice != "")
    res = res.replace(new RegExp(ssrcVoice, 'g'), (parseInt(userid) * 2).toString());
  if (ssrcVideo != "")
    res = res.replace(new RegExp(ssrcVideo, 'g'), userid);
  if (ssrcPLI != "")
    res = res.replace(new RegExp(ssrcPLI, 'g'), "456");
  sessionDescription.sdp = res.substr(0, res.length - 1);
  console.log('Offer sending message', sessionDescription);

  // peerconnection.setConfiguration(getConfigPeerConnectionOld())
  peerconnection.setLocalDescription(sessionDescription);
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

function getOffer(type, peerId) {
    var sdp = ""
    var sessionVideo = peerId
    var sessionAudio = (parseInt(peerId) * 2).toString()
    console.log(type)
    if (!type || type.audio && type.video) {

        sdp = "v=0\n" +
            "o=- 1443513048222864666 2 IN IP4 127.0.0.1\n" +
            "s=-\n" +
            "t=0 0\n" +
            "a=group:BUNDLE audio video\n" +
            "a=msid-semantic: WMS stream_id\n" +
            "m=audio 9 UDP/TLS/RTP/SAVPF 111\n" +
            "c=IN IP4 0.0.0.0\n" +
            "a=rtcp:9 IN IP4 0.0.0.0\n" +
            "a=ice-ufrag:room" + room + "\n" +
            "a=ice-pwd:asd88fgpdd777uzjYhagZg\n" +
            "a=ice-options:trickle\n" +
            "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n" +
            "a=setup:actpass\n" +
            "a=mid:audio\n" +
            "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n" +
            "a=sendrecv\n" +
            "a=rtcp-mux\n" +
            "a=rtpmap:111 opus/48000/2\n" +
            "a=rtcp-fb:111 transport-cc\n" +
            "a=fmtp:111 minptime=10;useinbandfec=1\n" +
            "a=ssrc:" + sessionAudio + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + sessionAudio + " msid:stream_id video_label\n" +
            "a=ssrc:" + sessionAudio + " mslabel:stream_id\n" +
            "a=ssrc:" + sessionAudio + " label:video_label\n" +
            "m=video 9 UDP/TLS/RTP/SAVPF 97 107\n" +
            "c=IN IP4 0.0.0.0\n" +
            "a=rtcp:9 IN IP4 0.0.0.0\n" +
            "a=ice-ufrag:room" + room + "\n" +
            "a=ice-pwd:asd88fgpdd777uzjYhagZg\n" +
            "a=ice-options:trickle\n" +
            "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n" +
            "a=setup:actpass\n" +
            "a=mid:video\n" +
            // "a=extmap:15 urn:ietf:params:rtp-hdrext:sdes:mid\n" +
            "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n" +
            "a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\n" +
            "a=sendrecv\n" +
            "a=rtcp-mux\n" +
            "a=rtcp-rsize\n" +
            "a=rtpmap:97 H264/90000\n" +
            "a=rtcp-fb:97 goog-remb\n" +
            "a=rtcp-fb:97 transport-cc\n" +
            "a=rtcp-fb:97 ccm fir\n" +
            "a=rtcp-fb:97 nack\n" +
            "a=rtcp-fb:97 nack pli\n" +
            "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n" +
            // "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n" +
            "a=rtpmap:107 rtx/90000\n" +
            "a=fmtp:107 apt=97\n" +
            "a=ssrc-group:FID " + sessionVideo + " 123\n" +
            "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n" +
            "a=ssrc:" + sessionVideo + " mslabel:stream_id\n" +
            "a=ssrc:" + sessionVideo + " label:video_label\n" +
            "a=ssrc:" + 123 + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + 123 + " msid:stream_id video_label\n" +
            "a=ssrc:" + 123 + " mslabel:stream_id\n" +
            "a=ssrc:" + 123 + " label:video_label\n"
    } else
    if (type.video)
        sdp = "v=0\n" +
        "o=- 1443513048222864666 2 IN IP4 127.0.0.1\n" +
        "s=-\n" +
        "t=0 0\n" +
        "a=group:BUNDLE video\n" +
        "a=msid-semantic: WMS stream_id\n" +
        "m=video 9 UDP/TLS/RTP/SAVPF 97 107\n" +
        "c=IN IP4 0.0.0.0\n" +
        "a=rtcp:9 IN IP4 0.0.0.0\n" +
        "a=ice-ufrag:room" + room + "\n" +
        "a=ice-pwd:asd88fgpdd777uzjYhagZg\n" +
        "a=ice-options:trickle\n" +
        "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n" +
        "a=setup:actpass\n" +
        "a=mid:video\n" +
        // "a=extmap:15 urn:ietf:params:rtp-hdrext:sdes:mid\n" +
        "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n" +
        "a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\n" +
        "a=sendrecv\n" +
        "a=rtcp-mux\n" +
        "a=rtcp-rsize\n" +
        "a=rtpmap:97 H264/90000\n" +
        "a=rtcp-fb:97 goog-remb\n" +
        "a=rtcp-fb:97 transport-cc\n" +
        "a=rtcp-fb:97 ccm fir\n" +
        "a=rtcp-fb:97 nack\n" +
        "a=rtcp-fb:97 nack pli\n" +
        "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n" +
        // "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n" +
        "a=rtpmap:107 rtx/90000\n" +
        "a=fmtp:107 apt=97\n" +
        "a=ssrc-group:FID " + sessionVideo + " 123\n" +
        "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n" +
        "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n" +
        "a=ssrc:" + sessionVideo + " mslabel:stream_id\n" +
        "a=ssrc:" + sessionVideo + " label:video_label\n" +
        "a=ssrc:" + 123 + " cname:f5FD5M4nwcZqWTiQ\n" +
        "a=ssrc:" + 123 + " msid:stream_id video_label\n" +
        "a=ssrc:" + 123 + " mslabel:stream_id\n" +
        "a=ssrc:" + 123 + " label:video_label\n"
    else


    if (type.audio)
        sdp = "v=0\n" +
        "o=- 1443513048222864666 2 IN IP4 127.0.0.1\n" +
        "s=-\n" +
        "t=0 0\n" +
        "a=group:BUNDLE audio\n" +
        "a=msid-semantic: WMS stream_id\n" +
        "m=audio 9 UDP/TLS/RTP/SAVPF 111\n" +
        "c=IN IP4 0.0.0.0\n" +
        "a=rtcp:9 IN IP4 0.0.0.0\n" +
        "a=ice-ufrag:room" + room + "\n" +
        "a=ice-pwd:asd88fgpdd777uzjYhagZg\n" +
        "a=ice-options:trickle\n" +
        "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n" +
        "a=setup:actpass\n" +
        "a=mid:audio\n" +
        "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n" +
        "a=sendrecv\n" +
        "a=rtcp-mux\n" +
        "a=rtpmap:111 opus/48000/2\n" +
        "a=rtcp-fb:111 transport-cc\n" +
        "a=fmtp:111 minptime=10;useinbandfec=1\n"
        // + "a=rtcp-fb:111 ccm fir\n"
        // + "a=rtcp-fb:111 nack\n"
        // + "a=rtcp-fb:111 nack pli\n"

    +
    "a=ssrc:" + sessionAudio + " cname:f5FD5M4nwcZqWTiQ\n" +
        "a=ssrc:" + sessionAudio + " msid:stream_id video_label\n" +
        "a=ssrc:" + sessionAudio + " mslabel:stream_id\n" +
        "a=ssrc:" + sessionAudio + " label:video_label\n"
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