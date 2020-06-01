'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
var express = require('express');
var https = require('https');
var fs = require('fs');
var id = 0
var cors = require('cors')
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
// var appHttps = https.createServer(options, app).listen(443);
app.use(cors())

function getUid(){
  id = id + 1
    return id+10;
}

app.use("/genuid", function (rep, res) {
  res.json({ "err": 0, "data": { "id": getUid() } })
})

app.use("/manager", function (rep, res) {
  res.sendfile("./public/callgroup_manager.html");
})
// app.use("/", function (rep, res) {
//   res.sendfile("./public/index_callgroup.html");
// })

// var io = socketIO.listen(appHttp);
var io = new socketIO();
io.attach(appHttp);
// io.attach(appHttps);

var roomManager = {};
var socketMenager = {};
io.sockets.on('connection', function (socket) {

  socket.on('join', function (data) {
    if (!roomManager[data.room]) {
      roomManager[data.room] = {};
    }
    var peer=parseInt(data.userid);

    roomManager[data.room][data.room] = { userid: data.room, video:true, audio:true };
    // for(var i=peer-2 ; i<=peer+2;i++){
    //     roomManager[data.room][i] = { userid: i, video:true, audio:true };
    // }
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
////
var userPc = {};
app.use('/sign_in', function(req, res) {
    if (!req.query.room || !req.query.peer_id)
        return res.send('');
    var uid = getUid();
    var peer_id = req.query.peer_id;
    var room = req.query.room;
    var strUid = uid + "," + uid + ",1\n";
    var strRoom = peer_id + "," + peer_id + ",1\n";
    userPc[uid] = { uid: uid, room: room, status: 0, peer_id: req.query.peer_id };
    res.header("Pragma", uid);
    res.send(strUid + room);
});

app.use('/wait', function(req, res) {
    if (!req.query.peer_id)
        return res.send('');
    var uid = req.query.peer_id;
    if (!userPc[uid])
        return;
    if (userPc[uid].status == 0) {
        var type = { audio: true, video: true };
        userPc[uid].status = 1;
        res.header("Pragma", userPc[uid].peer_id);
        var offer = getOffer(type, userPc[uid].peer_id, userPc[uid].room);
        res.send(JSON.stringify(offer));
    } else if (userPc[uid].status == 1) {
        userPc[uid].status = 2;
        var server = "222.255.216.226";
        var port = "8210";
        res.header("Pragma", userPc[uid].peer_id);
        var candidate = getRTCIceCandidate(server, port, userPc[uid].room);
        res.send(JSON.stringify(candidate));
    }
});


app.use("/", function(req, res) {
    res.sendfile("./public/index_callgroup.html");
})

function getOffer(type, peerId, room) {
    var sdp = ""
    var sessionVideo = peerId
    var sessionAudio = (parseInt(peerId) * 2).toString()
    var sessionVideo1= parseInt(peerId)-1;
    var sessionVideo2= parseInt(peerId)+1;
    var sessionVideo3= parseInt(peerId)-2;
    var sessionVideo4= parseInt(peerId)+2;

    console.log(type)
    if (!type || type.audio == true && type.video == true) {

        sdp = "v=0\n" +
            "o=- 1443513048222864666 2 IN IP4 127.0.0.1\n" +
            "s=-\n" +
            "t=0 0\n" +
            "a=group:BUNDLE audio video\n" +
            "a=msid-semantic: WMS *\n" +
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
            // "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n" +
            "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n" +
            "a=rtpmap:107 rtx/90000\n" +
            "a=fmtp:107 apt=97\n" +
            "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n" +
            "a=ssrc:" + sessionVideo1 + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + sessionVideo1 + " msid:stream_id1 video_label\n" +
            "a=ssrc:" + sessionVideo2 + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + sessionVideo2 + " msid:stream_id2 video_label\n" +
            "a=ssrc:" + sessionVideo3 + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + sessionVideo3 + " msid:stream_id3 video_label\n" +
            "a=ssrc:" + sessionVideo4 + " cname:f5FD5M4nwcZqWTiQ\n" +
            "a=ssrc:" + sessionVideo4 + " msid:stream_id4 video_label\n" 
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
        "a=extmap:14 urn:ietf:params:rtp-hdrext:sdes:mid\n" +
        "a=sendrecv\n" +
        "a=rtcp-mux\n" +
        "a=rtcp-rsize\n" +
        "a=rtpmap:97 H264/90000\n" +
        "a=rtcp-fb:97 goog-remb\n" +
        "a=rtcp-fb:97 transport-cc\n" +
        "a=rtcp-fb:97 ccm fir\n" +
        "a=rtcp-fb:97 nack\n" +
        "a=rtcp-fb:97 nack pli\n" +
        "a=fmtp:97 level-asymmetry-allowed=0;packetization-mode=0;profile-level-id=42e01f\n" +
        "a=rtpmap:107 rtx/90000\n" +
        "a=fmtp:107 apt=97\n" +
        "a=fmtp:97 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f\n" +
        "a=ssrc:" + sessionVideo + " cname:f5FD5M4nwcZqWTiQ\n" +
        "a=ssrc:" + sessionVideo + " msid:stream_id video_label\n" +
        "a=ssrc:" + sessionVideo + " mslabel:stream_id\n" +
        "a=ssrc:" + sessionVideo + " label:video_label\n"
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

function getRTCIceCandidate(server, port, room) {
    var candidateStr = "candidate:23643136 1 udp 41885439 " + server + " " + port + " typ relay generation 0 ufrag room" + room + " network-id 1"
    return { candidate: candidateStr, sdpMLineIndex: 0, sdpMid: "" };
}