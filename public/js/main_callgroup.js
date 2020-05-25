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
var mDataRoom = {};
var mPeerConnection = null;

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
  mDataRoom = data;
  var roomName = room;
  console.log(mDataRoom);
  CreateMeeting(roomName, mDataRoom);
  // for (var i in data) {
  //   var peerId = data[i].userid;
  //   JoinMeeting(peerId);
  // }
});


socket.on('user_join', function (data) {
  mDataRoom = data;
  var roomName = room;
  console.log(mDataRoom);
  CreateMeeting(roomName, mDataRoom);
  // console.log('user_join:', peerId);
  // JoinMeeting(peerId);
});

window.onbeforeunload = function () {
  socket.emit("bye", { room: room, userid: userid });
};

function getConfigRTCPeerConnection(userid, room, session) {
  var username = room + ":" + userid + ":" + session;
  var pcConfig = {
    'iceServers': [
      //   {
      //   'urls': 'turn:' + server + ":" + port + '?transport=udp',
      //   "username": username,
      //   "credential": "123456"
      // }
    ],
    sdpSemantics:'unified-plan'
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
      port = "8210"
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
  socket.emit('join', { room: room, userid: userid, video: constraints.video, audio: constraints.audio });
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

function CreateMeeting(roomName, dataRoom) {
  if (mPeerConnection == null) {
    var pc = CreateRTCPeerConnection();
    if (pc == null)
      return false;
    mPeerConnection = pc;
  } else {
    configOffer.iceRestart = true;
  }
  maybeStart(mPeerConnection, roomName, dataRoom);
}


function maybeStart(peerconnection, roomName, dataRoom) {
  var offer = getOffer(roomName, dataRoom)
  console.log(offer);
  peerconnection.setRemoteDescription(offer)
  peerconnection.createAnswer().then(function (sessionDescription) {
    setLocalAndAddCandidate(peerconnection, roomName, dataRoom, sessionDescription);
  });
}

function CreateRTCPeerConnection() {

  console.log('>>>>>> creating peer connection');

  try {
    var pcConfig = getConfigRTCPeerConnection(userid, room, session)
    if (!pcConfig)
      return null;
    var pc = new RTCPeerConnection({sdpSemantics:'plan-b'});
    pc.onaddstream = function (event) {
      var id = event.stream.id;
      console.log('Remote stream added by peerId:', id, event);
      var remoteStream = event.stream;
      $("#videos").append('<video id="remoteVideo' + id + '" autoplay playsinline></video>');
      var remoteVideo = document.querySelector('#remoteVideo' + id);
      remoteVideo.srcObject = remoteStream;
    };
    pc.onremovestream = function (event) {
      console.log('Remote stream remove by peerId:' + event,event.stream);
    };
    pc.onicecandidate = function (e) {
    };
    pc.addStream(localStream);
    // pc.oniceconnectionstatechange = handleIceConnectionStateChange;
    console.log('Created RTCPeerConnnection sessecion');
    return pc;
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
  }
  return null

}

/////////////////////////////////////////


function setLocalAndAddCandidate(peerconnection, roomName, dataRoom, sessionDescription) {
  var sdp = sessionDescription.sdp;
  var sdpList = sdp.split('\n');
  var res = "";
  var ssrcVideo = ""
  var ssrcVoice = ""
  var ssrcPLI = ""
  var dem = 0

  sdpList.forEach(element => {
    var e = element;
    if (e.startsWith("a=ice-ufrag"))
      e = "a=ice-ufrag:" + userid + "_" + roomName;
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


/////////////////////////////////////////////////////
function getOffer(roomName, dataRoom) {
  var sdp = buildOffer(roomName, dataRoom);
  var message = { sdp: sdp, type: "offer" };
  return message
}
var sttRestart = 0;

function buildOffer(roomName, dataRoom) {
  // sttRestart++;
  var sdp = ""
    + "v=0\n"
    + "o=- 1443513048222864666 " + sttRestart + " IN IP4 127.0.0.1\n"
    + "s=-\n"
    + "t=0 0\n"
    + "a=group:BUNDLE audio video\n"
    + "a=msid-semantic: WMS *\n"
  var sdpAudio = ""
    + "m=audio 9 UDP/TLS/RTP/SAVPF 111\n"
    + "c=IN IP4 0.0.0.0\n"
    + "a=rtcp:9 IN IP4 0.0.0.0\n"
    + "a=ice-ufrag:room" + roomName + "\n"
    + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
    + "a=ice-options:trickle\n"
    + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
    + "a=setup:actpass\n"
    + "a=mid:audio\n"
    + "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n"
    + "a=sendrecv\n"
    + "a=rtcp-mux\n"
    + "a=rtcp-rsize\n"
    + "a=rtpmap:111 opus/48000/2\n"
    + "a=rtcp-fb:111 transport-cc\n"
    + "a=fmtp:111 minptime=10;useinbandfec=1\n";
  var sdpVideo = ""
    + "m=video 9 UDP/TLS/RTP/SAVPF 97 107\n"
    + "c=IN IP4 0.0.0.0\n"
    + "a=rtcp:9 IN IP4 0.0.0.0\n"
    + "a=ice-ufrag:room" + roomName + "\n"
    + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
    + "a=ice-options:trickle\n"
    + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
    + "a=setup:actpass\n"
    + "a=mid:video\n"
    + "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n"
    + "a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\n"
    + "a=sendrecv\n"
    + "a=rtcp-mux\n"
    + "a=rtcp-rsize\n"
    + "a=rtpmap:97 H264/90000\n"
    + "a=rtcp-fb:97 goog-remb\n"
    + "a=rtcp-fb:97 transport-cc\n"
    + "a=rtcp-fb:97 ccm fir\n"
    + "a=rtcp-fb:97 nack\n"
    + "a=rtcp-fb:97 nack pli\n"
    + "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n"
    + "a=rtpmap:107 rtx/90000\n"
    + "a=fmtp:107 apt=97\n"
  
  var keys = dataRoom.keys;
  var demSTT=0;
  Object.keys(dataRoom).forEach(i => {
    var peerUser = dataRoom[i]; 
    var peerId = peerUser.userid;
    if (peerId == userid)
      return;
      demSTT++;
    // groupBundle = groupBundle + " audio" + peerId + " video" + peerId;
    // semantic = semantic + " stream" + peerId
    // if(demSTT<2)
    sdpAudio += getAudio(peerId, roomName);
    sdpVideo += getVideo(peerId, roomName);
  })

  sdp = sdp  + sdpAudio + sdpVideo;
  return sdp;
}

function getAudio(peerId, roomName) {

  var sessionVideo = peerId
  var sessionAudio = (parseInt(peerId) * 2).toString()
  var sdpAudio = ""
    + "a=ssrc:" + sessionAudio + " cname:"+sessionVideo+"\n"
    + "a=ssrc:" + sessionAudio + " msid:" + sessionVideo + " "+sessionVideo+"\n"
  return sdpAudio
}

function getVideo(peerId, roomName) {
  var sessionVideo = peerId
  var ssrcTamp=(parseInt(peerId) * 3).toString()
  var sdpVideo = ""
  + "a=ssrc-group:FID " + sessionVideo + " "+ssrcTamp+"\n"
  + "a=ssrc:" + sessionVideo + " cname:"+sessionVideo+"\n"
  + "a=ssrc:" + sessionVideo + " msid:" + sessionVideo + " "+sessionVideo+"\n"
  + "a=ssrc:" + ssrcTamp + " cname:"+sessionVideo+"\n"
  + "a=ssrc:" + ssrcTamp + " msid:" + sessionVideo + " "+sessionVideo+"\n"
 
  return sdpVideo;
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