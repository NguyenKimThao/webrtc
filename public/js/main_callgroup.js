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
var isStart = false;
var constraintsGobal = {};
var isShareScreen = false;
var typeCall = 0; //0: web is callee , 1: web is caller, default: web is callee
var loopBack = 0;
var dataChannel = null;
var userShareScreenId = 0;

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
    // 'iceServers': [
    //   {
    //     'urls': 'turn:' + server + ":" + port + '?transport=udp',
    //     "username": username,
    //     "credential": "123456"
    //   }
    // ],
    sdpSemantics: 'plan-b',
    bundlePolicy: 'max-bundle'
  };
  return pcConfig;
}


function initCall() {
  if (isStart == true)
    return 1;
  room = $("#room").val();
  session = room;
  server = $("#server").val()
  port = $("#port").val()
  version = $("#version").val()
  loopBack = $("#loopBack").val() | 0
  if (!server || server == "") {
    server = $("#servercb").val()
    if (server == "127.0.0.1") {
      port = "3010"
      // server = "10.79.21.221"
    }

    else if (server == "222.255.216.226")
      port = "8100"
    else if (server == "172.25.97.95") {
      server = "222.255.216.226"
      port = "8205"
    } else
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
  // if (userid == room) {
  //   alert("KhÃ´ng Ä‘á»ƒ roomID phai khÃ¡c vá»›i userID ")
  //   return 0
  // }
  $("#actionVideo").show();
  $("#joinaudio").prop('disabled', true);
  $("#joinvideo").prop('disabled', true);
  $("#joincall").prop('disabled', true);
  return 1;


}
/////////////////

navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    console.log(devices)
    const videos = devices.filter(device => device.kind === 'videoinput');
    for (var i = 0; i < videos.length; i++) {
      var video = videos[i];
      $("#listCamara").append('<option value="' + video.deviceId + '">' + video.label + '</option>')
    }
  });

function ChangeCamara() {
  if (!isStart)
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
  if (video) {
    var width = parseInt($("#width").val()) | 640;
    var height = parseInt($("#height").val()) | 480;
    var deviceId = $("#listCamara").val();
    constraints = {
      video: {
        frameRate: {
          min: 18,
          max: 30
        },
        width: width,
        height: height,
        deviceId: deviceId
      },
      audio: audio
    };
  }

  configOffer = {
    offerToReceiveVideo: video,
    offerToReceiveAudio: audio,
  }

  console.log(constraints)
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotStream(stream) {
  if (isStart == false) {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
    socket.emit('join', { room: room, userid: userid, video: constraints.video, audio: constraints.audio, loopBack: loopBack });
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

function getUserShareScreen(cb) {

  $.get("/genuid", function (res) {
    userShareScreenId = res.data.id;
    cb()
  });
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
    $("#room").val(userid);
    // $("#room").val(1);
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
  isStart = true;
  maybeStart(mPeerConnection, roomName, dataRoom);
}


function maybeStart(peerconnection, roomName, dataRoom) {
  var offer = getOffer(roomName, dataRoom)
  console.log(offer);
  peerconnection.setRemoteDescription(offer)
  peerconnection.createAnswer().then(function (sessionDescription) {
    setLocalAndAddCandidate(peerconnection, roomName, dataRoom, sessionDescription);
    setInterval(ping, 1000);
  });
}

function CreateRTCPeerConnection() {

  console.log('>>>>>> creating peer connection');

  try {
    var pcConfig = getConfigRTCPeerConnection(userid, room, session)
    if (!pcConfig)
      return null;
    var pc = new RTCPeerConnection(pcConfig);
    pc.onaddstream = function (event) {
      var stream = event.stream;;
      var id = event.stream.id;
      if (id.startsWith("{"))
        return;
      if (stream.getAudioTracks()[0]) {
        stream.getAudioTracks()[0].enabled = false;
      }
      console.log('Remote stream added by peerId:', id, event);
      roomManager[id] = stream;
      var videoRemove = $('<div class="col-sm-2" id="peer' + id + '"></div>');
      var idvideo = $(videoRemove.append('<div class="row">').children()[0]);
      idvideo.append('<video id="remoteVideo' + id + '" autoplay playsinline></video>');
      var idRow = $(videoRemove.append('<div class="row">').children()[1]);
      idRow.append('<button type="button" onclick="ToggleVideo(\'' + id + '\')">OnOffVideo</button>');
      idRow.append('<button type="button" onclick="ToogleAudio(\'' + id + '\')">OnOffAudio</button>');
      setInterval(() => {
        if (stream.getVideoTracks() && stream.getVideoTracks()[0]) {
          let fps = 0;
          let width = stream.getVideoTracks()[0].getSettings().width
          let height = stream.getVideoTracks()[0].getSettings().height
          if (stream.getVideoTracks() && stream.getVideoTracks()[0]) {
            fps = stream.getVideoTracks()[0].getSettings().frameRate
          }
          $("#w" + id).html(" Wight:" + width);
          $("#h" + id).html(" Height:" + height);
        }

      }, 1000)
      idRow.append('<spane>PeerId ' + id + ' </spane><spane id="w' + id + '">Wight: 0</spane><spane id="h' + id + '">Height: 0</spane>');
      $("#videoremotes").append(videoRemove);
      // $("#videos").append('<video id="remoteVideo' + id + '" autoplay playsinline></video>');
      var remoteVideo = document.querySelector('#remoteVideo' + id);
      remoteVideo.srcObject = stream;


      // var speechEvents = hark(stream);
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
    pc.addStream(localStream);

    // pc.addTransceiver(localStream.getVideoTracks()[0], {
    //   direction: "sendrecv",
    //   streams: [localStream],
    //   sendEncodings: [
    //     { rid: "h", maxBitrate: 1200 * 1024 },
    //     { rid: "m", maxBitrate: 600 * 1024, scaleResolutionDownBy: 2 },
    //     { rid: "l", maxBitrate: 300 * 1024, scaleResolutionDownBy: 4 }
    //   ]
    // });
    // console.log(pc.getSenders());

    dataChannel = pc.createDataChannel("data_channel", {});
    roomManager[userid] = localStream;

    pc.addEventListener("iceconnectionstatechange", event => {
      console.log('stats:', pc.iceConnectionState)
      if (pc.iceConnectionState === "failed") {
        // pc.restartIce();
      }
    });

    // pc.oniceconnectionstatechange = handleIceConnectionStateChange;
    console.log('Created RTCPeerConnnection sessecion');
    return pc;
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
  }
  return null

}

function RestartIce() {
  mPeerConnection.restartIce();
}

function sendDataChannel(data) {
  // console.log('send data:', dataChannel, data)
  if (dataChannel && dataChannel.readyState == 'open') {
    dataChannel.send(JSON.stringify(data));
  }
}

function ping() {
  var data = {
    actionType: "ping",
    enableAudio: true,
    enableVideo: true,
    streams: []
  };

  for (var k in roomManager) {
    var stream = roomManager[k];
    var quality = $("#quality").val() ? $("#quality").val() : 0;
    var enableAudio = stream.getAudioTracks() && stream.getAudioTracks()[0] ? stream.getAudioTracks()[0].enabled : false;
    var pingData = {
      peerId: stream.id,
      quality: quality,
      enableAudio: enableAudio
    };
    pingData.enableVideo = stream.getVideoTracks() && stream.getVideoTracks()[0] ? stream.getVideoTracks()[0].enabled : false;
    data.streams.push(pingData);
  };
  sendDataChannel(data);
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
      e = "a=ice-ufrag:v=1_peerId=" + userid + "_shareId=" + 0 + "_typeCall=" + typeCall + "_loopBack=" + loopBack + "_nRetry=" + 0 + "_object=" + 0;
    if (e.startsWith("a=fmtp:97")) {
      // e = "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n"
      // e = e + "a=ssrc:30000 cname:1000"
    }
    // if(e.startsWith("a=fingerprint"))
    //   e = "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05"
    if (e.startsWith("a=ice-pwd:"))
      e = "a=ice-pwd:asd88fgpdd777uzjYhagZg"
    if (e.startsWith("a=mid:video")) {
      // e = e + "\n"
      // e = e + "a=rid:h send\n"
      //   + "a=rid:m send\n"
      //   + "a=rid:l send\n"
      //   + "a=simulcast:send h;m;l"
      //     + "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n"
      // + "a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"
    }
    if (e.startsWith("a=recvonly")) {
      e = "a=sendrecv";
    }
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
    res = res.replace(new RegExp(ssrcVideo, 'g'), userShareScreenId ? userShareScreenId : userid);
  if (ssrcPLI != "")
    res = res.replace(new RegExp(ssrcPLI, 'g'), "456");
  sessionDescription.sdp = res.substr(0, res.length - 1);
  console.log('Offer sending message', sessionDescription);

  // peerconnection.setConfiguration(getConfigPeerConnectionOld())
  peerconnection.setLocalDescription(sessionDescription);
  peerconnection.addIceCandidate(getRTCIceCandidate());
  console.log('getRTCIceCandidate()', getRTCIceCandidate())
}


/////////////////////////////////////////////////////
function getOffer(roomName, dataRoom) {
  var sdp = buildOffer(roomName, dataRoom);
  var message = { sdp: sdp, type: "offer" };
  return message
}

function buildOffer(roomName, dataRoom) {
  var sdp = ""
    + "v=0\n"
    + "o=- 1443513048222864666 " + 0 + " IN IP4 127.0.0.1\n"
    + "s=-\n"
    + "t=0 0\n"
    + "a=group:BUNDLE audio video data\n"
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
    + "m=video 9 UDP/TLS/RTP/SAVPF 96\n"
    + "c=IN IP4 0.0.0.0\n"
    + "a=rtcp:9 IN IP4 0.0.0.0\n"
    + "a=ice-ufrag:room" + roomName + "\n"
    + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
    + "a=ice-options:trickle\n"
    + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
    + "a=setup:actpass\n"
    + "a=mid:video\n"
    + "b=AS:800\n"
    + "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n"
    + "a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\n"
    // + "a=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid\n"
    + "a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id\n"
    // + "a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id\n"
    + "a=sendrecv\n"
    + "a=rtcp-mux\n"
    + "a=rtcp-rsize\n"
    + "a=rtpmap:96 H264/90000\n"
    + "a=rtcp-fb:96 goog-remb\n"
    + "a=rtcp-fb:96 transport-cc\n"
    + "a=rtcp-fb:96 ccm fir\n"
    + "a=rtcp-fb:96 nack\n"
    + "a=rtcp-fb:96 nack pli\n"
    + "a=fmtp:96 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n"
  // + "a=rid:h recv\n"
  // + "a=rid:m recv\n"
  // + "a=rid:l recv\n"
  // + "a=simulcast:recv h;m;l\n"

  var sdpDataChannel = ""
    + "m=application 9 UDP/DTLS/SCTP webrtc-datachannel\n"
    + "c=IN IP4 0.0.0.0\n"
    + "a=ice-ufrag:room" + roomName + "\n"
    + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
    + "a=ice-options:trickle\n"
    + "a=setup:actpass\n"
    + "a=fingerprint:sha-256 F0:11:FC:75:A5:58:A2:30:85:A2:88:ED:38:58:AC:4F:C0:7E:DD:44:E4:84:99:ED:13:1C:89:E9:7D:C1:5B:05\n"
    + "a=mid:data\n"
    + "a=sctpmap:5000 webrtc-datachannel 1024\n";

  // + "a=rtpmap:107 rtx/90000\n"
  // + "a=fmtp:107 apt=97\n"

  var keys = dataRoom.keys;
  Object.keys(dataRoom).forEach(i => {
    var peerUser = dataRoom[i];
    var peerId = peerUser.userid;
    if (peerId == userid)
      return;
    // groupBundle = groupBundle + " audio" + peerId + " video" + peerId;
    // semantic = semantic + " stream" + peerId
    sdpAudio += getAudio(peerId, roomName);
    sdpVideo += getVideo(peerId, roomName);
  })

  sdp = sdp + sdpAudio + sdpVideo + sdpDataChannel;
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
    getUserShareScreen(() => {
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
      isShareScreen = true;
    })

  } else {
    call(configOffer.offerToReceiveVideo, configOffer.offerToReceiveAudio);
    userShareScreenId = 0;
    isShareScreen = false;
  }
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
    pc.getReceivers().forEach(receiver => {
      console.log('recv:', receiver)
      if (receiver.track.kind != "video") return;
      receiver.getStats(receiver.track).then(stats => {
        let statsOutput = "";

        stats.forEach(report => {
          if (report.type != "inbound-rtp")
            return;
          statsOutput += `<h2>Report: ${report.type}</h2>\n<strong>ID:</strong> ${report.id}<br>\n` +
            `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;

          // Now the statistics for this report; we intentially drop the ones we
          // sorted to the top above

          Object.keys(report).forEach(statName => {
            if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
              statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
            }
          });
        });

        // console.log(statsOutput);
      });

    })

    // pc.getStats(null).then(stats => {
    //   let statsOutput = "";
    //   for (var report in stats) {
    //     statsOutput += `<h2>Report: ${report.type}</h3>\n<strong>ID:</strong> ${report.id}<br>\n` +
    //       `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;
    //     console.log(report, statsOutput);
    //     // Now the statistics for this report; we intentially drop the ones we
    //     // sorted to the top above

    //     // Object.keys(report).forEach(statName => {
    //     //   if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
    //     //     statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
    //     //     console.log(statsOutput)
    //     //   }
    //     // });
    //   }
    // });

  }, 10000);
}


// testInit();

function testInit() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(gotStreamTest).catch(function (e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

async function startTest(stream) {

  /* sender */
  let sender = new RTCPeerConnection({ showSsrcInSimulcastOffer: true });
  sender.onicecandidate = e => receiver.addIceCandidate(e.candidate);
  sender.addTransceiver(stream.getVideoTracks()[0], {
    direction: "sendrecv",
    streams: [stream],
    sendEncodings: [
      { rid: "h", maxBitrate: 1200 * 1024 },
      { rid: "m", maxBitrate: 600 * 1024, scaleResolutionDownBy: 2 },
      { rid: "l", maxBitrate: 300 * 1024, scaleResolutionDownBy: 4 }
    ]
  });
  console.log(sender.getSenders());
  /* receiver */
  let receiver = new RTCPeerConnection();
  receiver.onicecandidate = e => sender.addIceCandidate(e.candidate);
  receiver.ontrack = e => document.getElementById("remoteVideo").srcObject = e.streams[0];

  let offer = await sender.createOffer();

  var msid = "";
  var s = "";
  var sdp = offer.sdp.split('\n');
  var res = "";
  sdp.forEach(e => {
    if (e.startsWith("a=fmtp:108")
      || e.startsWith("a=rtpmap:109")
      || e.startsWith("a=rtpmap:119")
      || e.startsWith("a=fmtp:119")
      || e.startsWith("a=fmtp:109")
      || e.startsWith("a=rtpmap:124")
      || e.startsWith("a=rtpmap:123")) {
      // e = "";
    }
    if (e) {
      res = res + e + "\n";
    }
  });
  // var ssrcVideo = "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 121 127 120 125 107 108 109 124 119 123"
  // res = res.replace(new RegExp(ssrcVideo, 'g'), "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 121 127 120 125 107 108");


  // res = res
  //   + "a=ssrc:3818935445 cname:/9xLVG5y0PJqxacG\n"
  //   + "a=ssrc:3818935446 cname:/9xLVG5y0PJqxacG\n"
  //   + "a=ssrc:3818935448 cname:/9xLVG5y0PJqxacG\n"
  //   + "a=ssrc-group:SIM 3818935445 3818935446 3818935448\n"
  offer.sdp = res;
  console.log(offer);
  await sender.setLocalDescription(offer);
  await receiver.setRemoteDescription(offer);

  let answer = await receiver.createAnswer();
  answer.sdp = answer.sdp
    + "a=rid:h recv\n"
    + "a=rid:m recv\n"
    + "a=rid:l recv\n"
    + "a=simulcast:recv h;m;l\n"
  console.log(answer);
  await receiver.setLocalDescription(answer);
  await sender.setRemoteDescription(answer);

  console.log(sender.getSenders()[0].getParameters())
}

function gotStreamTest(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
  startTest(stream);
}
