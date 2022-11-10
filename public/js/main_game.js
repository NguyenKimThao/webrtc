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
var isStart = 0;
var constraintsGobal = {};
var isShareScreen = false;
var typeCall = 0; //0: web is callee , 1: web is caller, default: web is callee
var loopBack = 0;
var info = { address: "", port: 0, username: "" }

$("#actionVideo").hide();

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
  ResetCamara();
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

});


socket.on('user_join', function (data) {
  mDataRoom = data;
  var roomName = room;
  console.log("user_join", mDataRoom);
  CreateMeeting(roomName, mDataRoom);
});

window.onbeforeunload = function () {
  socket.emit("bye", { room: room, userid: userid });
};

function getConfigRTCPeerConnection(server, port) {
  var pcConfig = {
    'iceServers': [
      {
        'urls': 'stun:' + server + ":" + (parseInt(port) + 1),
      }
    ],
    sdpSemantics: 'plan-b',
    bundlePolicy: 'max-bundle'
  };
  return pcConfig;
}


function initCall() {
  try {
    if (isStart != 0)
      return 1;
    room = $("#room").val();
    server = $("#server").val()
    port = $("#port").val()
    loopBack = $("#loopBack").val() | 0
    if (!server || server == "") {
      var servercv = $("#servercb").val().split(":");
      server = servercv[0]
      port = servercv[1]
    }

    if (!userid || userid == "") {
      alert("Userid chÆ°a cÃ³, vui lÃ²ng reset láº¡i Ä‘á»ƒ láº¥y userid")
      return 0
    }

    if (!server || server == "" || !port || port == "" || parseInt(port) <= 0) {
      alert("KhÃ´ng Ä‘á»ƒ server trá»‘ng")
      return 0
    }
    if (!room || room == "") {
      alert("KhÃ´ng Ä‘á»ƒ room trá»‘ng")
      return 0;
    }
    // if (userid == room) {
    //   alert("KhÃ´ng Ä‘á»ƒ roomID phai khÃ¡c vá»›i userID ")
    //   return 0
    // }
    $("#actionVideo").show();
    $("#joinaudio").prop('disabled', true);
    $("#joinvideo").prop('disabled', true);
    $("#joincall").prop('disabled', true);
    return 1;
  } catch (ex) {

  }
  return 0;

}
/////////////////

function ResetCamara() {
  $("#listCamara").empty();
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      const videos = devices.filter(device => device.kind === 'videoinput');
      console.log(devices, videos);
      for (var i = 0; i < videos.length; i++) {
        var video = videos[i];
        $("#listCamara").append('<option value="' + video.deviceId + '">' + video.label + '</option>')
      }
    });

}

function ChangeCamara() {
  if (isStart == 0)
    return false;
  call(configOffer.offerToReceiveVideo, configOffer.offerToReceiveAudio)
}

function call(video, audio) {
  var initcall = initCall();
  if (initcall == 0)
    return

  constraints = {
    video: video,
    audio: audio
  };

  var deviceId = $("#listCamara").val();
  if (video && deviceId) {
    constraints.video = { deviceId: deviceId };
  }

  configOffer = {
    offerToReceiveVideo: video,
    offerToReceiveAudio: audio,
  }

  console.log("call:", constraints)
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotStream(stream) {
  if (isStart == 0) {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
    CreateMeeting(room, {});
  }
  else {
    stream.getVideoTracks().forEach(function (track) {
      var sender = mPeerConnection.getSenders().find(function (s) {
        return s.track.kind == track.kind;
      });
      if (sender) {
        sender.replaceTrack(track);
      }
    });

    //stop track old
    localStream.getTracks().forEach(track => track.stop())
    localStream = stream;
    localVideo.srcObject = stream;
    roomManager[userid] = localStream;

  }
}
function getSession() {
  $.get("/genuid", function (res) {
    userid = res.data.id;
    $("#room").val(userid);
    $("#userid").val(userid)
  });
}

function getRTCIceCandidate() {
  var candidateStr = "candidate:23643136 1 udp 41885439 " + server + " " + port + " typ host generation 0 ufrag room" + room + " network-id 1"
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


async function maybeStart(peerconnection, roomName, dataRoom) {

  var offer = await getOffer(roomName, dataRoom)
  console.log(offer);
  await peerconnection.setRemoteDescription(offer)
  var sdpAnwser = await peerconnection.createAnswer();
  await setLocalAndAddCandidate(peerconnection, roomName, dataRoom, sdpAnwser);

}

function CreateRTCPeerConnection() {

  console.log('>>>>>> creating peer connection');

  try {
    var pcConfig = getConfigRTCPeerConnection(server, port)
    if (!pcConfig)
      return null;
    var pc = new RTCPeerConnection(pcConfig);
    pc.onaddstream = function (event) {
      var id = event.stream.id;
      console.log('Remote stream added by peerId:', id, event);
      var remoteStream = event.stream;
      roomManager[id] = remoteStream;
      var videoRemove = $('<div class="col-sm-2" id="peer' + id + '"></div>');
      var idvideo = $(videoRemove.append('<div class="row">').children()[0]);
      idvideo.append('<video id="remoteVideo' + id + '" autoplay playsinline></video>');
      var idRow = $(videoRemove.append('<div class="row">').children()[1]);
      idRow.append('<button type="button" onclick="ToggleVideo(\'' + id + '\')">OnOffVideo</button>');
      idRow.append('<button type="button" onclick="ToogleAudio(\'' + id + '\')">OnOffAudio</button>');

      idRow.append('<spane>PeerId ' + id + '</spane>');
      $("#videoremotes").append(videoRemove);
      // $("#videos").append('<video id="remoteVideo' + id + '" autoplay playsinline></video>');
      var remoteVideo = document.querySelector('#remoteVideo' + id);
      remoteVideo.srcObject = remoteStream;


      // var speechEvents = hark(remoteStream);
      // speechEvents.on('speaking', function () {
      //   $("#peer" + id).addClass('speakerStart')
      // });

      // speechEvents.on('stopped_speaking', function () {
      //   $("#peer" + id).removeClass('speakerStart')
      // });

    };
    pc.onremovestream = function (event) {
      console.log('Remote stream remove by peerId:' + event, event.stream);
    };
    pc.onicecandidate = function (e) {
    };
    pc.oniceconnectionstatechange = function (e) {
    }
    pc.onicegatheringstatechange = function (e) {
    }
    pc.addStream(localStream);
    roomManager[userid] = localStream;
    console.log('Created RTCPeerConnnection sessecion');
    return pc;
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
  }
  return null

}

/////////////////////////////////////////


async function setLocalAndAddCandidate(peerconnection, roomName, dataRoom, sessionDescription) {
  var sdp = sessionDescription.sdp;
  var sdpList = sdp.split('\n');
  var res = "";
  var ssrcVideo = ""
  var ssrcVoice = ""
  var ssrcPLI = ""
  var dem = -1

  sdpList.forEach(element => {
    var e = element;
    if (e.startsWith("a=ice-pwd:"))
      e = "a=ice-pwd:asd88fgpdd777uzjYhagZg"
    if (e.startsWith("m=audio")) {
      info.port = e.split(" ")[1];
      dem = 0
      console.log('setpott :', info.port)
    }
    if (dem == 0 && e.startsWith("c=IN IP4")) {
      info.address = e.split(" ")[2];
      console.log('setadress:', info.address)
    }
    if (dem == 0 && e.startsWith("a=ice-ufrag")) {
      info.username = e.split(":")[1];
    }

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
  console.log('answer sending message', sessionDescription);
  console.log('answer sending message to string', sessionDescription.sdp.toString());

  await peerconnection.setLocalDescription(sessionDescription);
  // peerconnection.addIceCandidate(getRTCIceCandidate());

  if (isStart == 0) {
    isStart = 1;
    setTimeout(function () {
      socket.emit('join', { room: room, userid: userid, constraints: constraints, loopBack: loopBack });
    }, 1000);

  } else {
    sendZRTP();
  }

}

function sendZRTP() {
  if (isStart != 1) return;
  isStart = 2;
  var url = "http://localhost:9992?key=zalo@q1w2e3&type=json&cmd=joinRoom&userId=" + userid + "&session=" + room + "&username=" + info.username
    + "&payloadTypeVoice=111&payloadTypeVideo=97&server=" + server + ":" + port
    + "&address=" + info.address + "&portVoice=" + info.port + "&portVideo=" + info.port + "&loopback=" + loopBack;
  $.ajax({
    url: url,
  }).done(function (data) {
    console.log(data);
  });
}




/////////////////////////////////////////////////////
async function getOffer(roomName, dataRoom) {
  var sdp = await buildOffer(roomName, dataRoom, stt++);
  var message = { sdp: sdp, type: "offer" };
  return message
}

async function buildOffer(roomName, dataRoom, stt) {
  var portVideo = parseInt(port) + 2;
  var sdp = ""
    + "v=0\n"
    + "o=- 1443513048222864666 " + stt + " IN IP4 127.0.0.1\n"
    + "s=-\n"
    + "t=0 0\n"
    + "a=group:BUNDLE audio video\n"
    + "a=ice-options:trickle\n"
    + "a=ice-lite\n"
    + "a=msid-semantic: WMS *\n"
  var sdpAudio = ""
    + "m=audio " + port + " UDP/TLS/RTP/SAVPF 111\n"
    + "c=IN IP4 " + server + "\n"
    + "a=rtcp:9 IN IP4 0.0.0.0\n"
    + "a=candidate:1 1 udp 41885439 " + server + " " + port + " typ host generation 0 network-id 1 network-cost 10\n"
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
    + "m=video 9 UDP/TLS/RTP/SAVPF 97 96\n"
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
    + "a=rtpmap:96 VP8/90000\n"
    + "a=rtcp-fb:96 goog-remb\n"
    + "a=rtcp-fb:96 transport-cc\n"
    + "a=rtcp-fb:96 ccm fir\n"
    + "a=rtcp-fb:96 nack\n"
    + "a=rtcp-fb:96 nack pli\n";

  var keys = dataRoom.keys;
  Object.keys(dataRoom).forEach(i => {
    var peerUser = dataRoom[i];
    var peerId = peerUser.userid;
    if (peerId == userid)
      return;
    sdpAudio += getAudio(peerId, roomName);
    sdpVideo += getVideo(peerId, roomName);
  })

  sdp = sdp + sdpAudio + sdpVideo;
  return sdp;
}

function getAudio(peerId, roomName) {

  var sessionVideo = peerId
  var sessionAudio = (parseInt(peerId) * 2).toString()
  var sdpAudio = ""
    + "a=ssrc:" + sessionAudio + " cname:" + sessionVideo + "\n"
    + "a=ssrc:" + sessionAudio + " msid:" + sessionVideo + " " + sessionVideo + "\n"
  return sdpAudio
}

function getVideo(peerId, roomName) {
  var sessionVideo = peerId
  var sdpVideo = ""
    + "a=ssrc:" + sessionVideo + " cname:" + sessionVideo + "\n"
    + "a=ssrc:" + sessionVideo + " msid:" + sessionVideo + " " + sessionVideo + "\n"

  return sdpVideo;
}

function ToggleShareScreen() {
  if (isShareScreen == false) {
    if (navigator.getDisplayMedia) {
      navigator.getDisplayMedia({ video: true }).then(gotStream).catch(function (e) {
        alert('getUserMedia() error: ' + e.name);
      });
    } else if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia({ video: true }).then(gotStream).catch(function (e) {
        alert('getUserMedia() error: ' + e.name);
      });
    } else {
      navigator.mediaDevices.getUserMedia({ video: { mediaSource: 'screen' } }).then(gotStream).catch(function (e) {
        alert('getUserMedia() error: ' + e.name);
      });
    }

  } else {
    call(configOffer.offerToReceiveVideo, configOffer.offerToReceiveAudio);
  }
  isShareScreen = isShareScreen ? false : true;
}

function ToggleVideoLocal() {
  ToggleVideo(userid)

}
function ToggleAudioLocal() {
  ToogleAudio(userid)
}

function ToggleVideo(peerId) {
  if (!roomManager[peerId])
    return;
  console.log(roomManager[peerId], roomManager[peerId].getVideoTracks());
  var tracks = roomManager[peerId].getVideoTracks();
  if (!tracks)
    return;
  for (var i = 0; i < tracks.length; i++) {
    var track = tracks[i];
    if (track && track.kind == "video") {
      track.enabled = track.enabled ? false : true;
    }
  }
}
function ToogleAudio(peerId) {
  if (!roomManager[peerId])
    return;
  console.log(roomManager[peerId].getAudioTracks());
  var tracks = roomManager[peerId].getAudioTracks();
  if (!tracks)
    return;
  for (var i = 0; i < tracks.length; i++) {
    var track = tracks[i];
    if (track && track.kind == "audio") {
      track.enabled = track.enabled ? false : true;
    }
  }
}



////////////////////////////////////////////////////////////////

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