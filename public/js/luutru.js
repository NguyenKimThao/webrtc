
function setLocalAndAddCandidateT(sessionDescription) {

    var sdp = sessionDescription.sdp;
    var sdpList = sdp.split('\n');
    var res = "";
    var rang = [103, 104, 0, 9, 8, 106, 105, 13, 110, 112, 113, 126]
    sdpList.forEach(element => {
      var e = element;
      if (e.startsWith("a=ice-ufrag:"))
        e = "a=ice-ufrag:remote"
      if (e.startsWith("a=ice-pwd:"))
        e = "a=ice-pwd:asd88fgpdd777uzjYhagZg"
      for (var i = 0; i < rang.length; i++) {
        if (e.startsWith("a=rtpmap:" + rang[i]))
          return
      }
      if (e.startsWith("a=ssrc:")) {
        var pos = e.indexOf(' ')
        e = "a=ssrc:" + session + e.substr(pos)
      }
      res = res + e + "\n";
    });
    sessionDescription.sdp = res.substr(0, res.length - 1);
    console.log('Offer sending message', sessionDescription);
    peerconnection.setLocalDescription(sessionDescription);
    var message = getAnswer(session, constraints)
    console.log('getAnswer sending message', message);
    peerconnection.setRemoteDescription(new RTCSessionDescription(message))
    peerconnection.addIceCandidate(getRTCIceCandidate());
  }
  
  function setLocalAndAddCandidate2s(sessionDescription) {
  
    var sdp = sessionDescription.sdp;
    console.log("offer", sessionDescription)
    var sdpList = sdp.split('\n');
    var res = ""
    var parse = parseSDP(sessionDescription.sdp)
    var streamID = sdpList[5].split(' ')[2]
    console.log("streamID ", streamID)
    // for (var i = 0; i < 6; i++)
    //   res = res + sdpList[i] + "\n"
    res = res + getAudioOffer(userid, streamID, sdpList[12])
    sessionDescription.sdp = res
    console.log('Offer sending message', sessionDescription);
    peerconnection.setLocalDescription(sessionDescription);
    var message = getAnswer(session, constraints)
    console.log('getAnswer sending message', message);
    peerconnection.setRemoteDescription(new RTCSessionDescription(message))
    peerconnection.addIceCandidate(getRTCIceCandidate());
  }
  
  function setLocalAndAddCandidateC(sessionDescription) {
  
    var version = $("#version").val()
    var sdp = sessionDescription.sdp;
    var sdpList = sdp.split('\n');
    var res = "";
    var fingerprint = ""
    var o = ""
    var msidS = ""
    sdpList.forEach(element => {
      var e = element;
      if (e.startsWith("a=fingerprint"))
        fingerprint = e;
      if (e.startsWith("o="))
        o = e;
      if (e.startsWith("a=msid-semantic"))
        msidS = e;
    });
    var msid = msidS.split(" ")[2]
  
    sessionDescription = createOffer(o, fingerprint, msid);
    console.log('Offer sending message', sessionDescription);
    peerconnection.setLocalDescription(sessionDescription);
    var message = getAnswer(constraints)
    console.log('getAnswer sending message', message);
    peerconnection.setRemoteDescription(new RTCSessionDescription(message))
    peerconnection.addIceCandidate(getRTCIceCandidate());
  }


  function getAudioOffer(seesionSSRC, stream_id, fingerprint, payloadtype) {
    var message = ""
      + "m=audio 9 UDP/TLS/RTP/SAVPF " + payloadtype + "\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:local\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + fingerprint + "\n"
      + "a=setup:actpass\n"
      + "a=mid:audio\n"
      + "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtpmap:" + payloadtype + " opus/48000/2\n"
      + "a=rtcp-fb:" + payloadtype + " transport-cc\n"
      + "a=fmtp:" + payloadtype + " minptime=10;useinbandfec=1\n"
      + "a=ssrc:" + seesionSSRC + "1 cname:f5FD5M4nwcZqWTiQ\n"
      + "a=ssrc:" + seesionSSRC + "1 msid:" + stream_id + " video_label\n"
      + "a=ssrc:" + seesionSSRC + "1 mslabel:" + stream_id + "\n"
      + "a=ssrc:" + seesionSSRC + "1 label:video_label\n"
    return message
  }
  function getVideoOffer(seesionSSRC, stream_id, fingerprint, payloadtype) {
    var message = ""
      + "m=video 9 UDP/TLS/RTP/SAVPF " + payloadtype + "\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:remote\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + fingerprint + "\n"
      + "a=setup:actpass\n"
      + "a=mid:video\n"
      + "a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\n"
      + "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n"
      + "a=extmap:4 urn:3gpp:video-orientation\n"
      + "a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\n"
      + "a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\n"
      + "a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\n"
      + "a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtcp-rsize\n"
      + "a=rtpmap:" + payloadtype + " H264/90000\n"
      + "a=rtcp-fb:" + payloadtype + " goog-remb\n"
      + "a=rtcp-fb:" + payloadtype + " transport-cc\n"
      + "a=rtcp-fb:" + payloadtype + " ccm fir\n"
      + "a=rtcp-fb:" + payloadtype + " nack\n"
      + "a=rtcp-fb:" + payloadtype + " nack pli\n"
      + "a=fmtp:" + payloadtype + " level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n"
      + "a=ssrc:" + seesionSSRC + " cname:40sfaMNo7FXkvIla\n"
      + "a=ssrc:" + seesionSSRC + " msid:" + msid + " e0d1a5de-616a-4db8-9bb6-6d38611f052f\n"
      + "a=ssrc:" + seesionSSRC + " mslabel:" + msid + "\n"
      + "a=ssrc:" + seesionSSRC + " label:e0d1a5de-616a-4db8-9bb6-6d38611f052f\n"
    return message
  }
  function createOffer(o, fingerprint, msid) {
    var sdp = ""
      + "v=0\n"
      + o + "\n"
      + "s=-\n"
      + "t=0 0\n"
      + "a=group:BUNDLE audio video\n"
      + "a=msid-semantic: WMS " + msid + "\n"
      + "m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:remote\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + fingerprint + "\n"
      + "a=setup:actpass\n"
      + "a=mid:audio\n"
      + "a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtpmap:111 opus/48000/2\n"
      + "a=rtcp-fb:111 transport-cc\n"
      + "a=fmtp:111 minptime=10;useinbandfec=1\n"
      + "a=rtpmap:103 ISAC/16000\n"
      + "a=rtpmap:104 ISAC/32000\n"
      + "a=rtpmap:9 G722/8000\n"
      + "a=rtpmap:0 PCMU/8000\n"
      + "a=rtpmap:8 PCMA/8000\n"
      + "a=rtpmap:106 CN/32000\n"
      + "a=rtpmap:105 CN/16000\n"
      + "a=rtpmap:13 CN/8000\n"
      + "a=rtpmap:110 telephone-event/48000\n"
      + "a=rtpmap:112 telephone-event/32000\n"
      + "a=rtpmap:113 telephone-event/16000\n"
      + "a=rtpmap:126 telephone-event/8000\n"
      + "a=ssrc:3758188683 cname:40sfaMNo7FXkvIla\n"
      + "a=ssrc:3758188683 msid:BQB5H7jD7ONVfWdwCsdPpWMgs2Z2TE2Q9sIe 13b7cc4d-0317-4543-af9d-f295f69ee7f2\n"
      + "a=ssrc:3758188683 mslabel:BQB5H7jD7ONVfWdwCsdPpWMgs2Z2TE2Q9sIe\n"
      + "a=ssrc:3758188683 label:13b7cc4d-0317-4543-af9d-f295f69ee7f2\n"
      + "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 123 127 122 125 107 108 109 124\n"
      + "c=IN IP4 0.0.0.0\n"
      + "a=rtcp:9 IN IP4 0.0.0.0\n"
      + "a=ice-ufrag:remote\n"
      + "a=ice-pwd:asd88fgpdd777uzjYhagZg\n"
      + "a=ice-options:trickle\n"
      + fingerprint + "\n"
      + "a=setup:actpass\n"
      + "a=mid:video\n"
      + "a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\n"
      + "a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n"
      + "a=extmap:4 urn:3gpp:video-orientation\n"
      + "a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\n"
      + "a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\n"
      + "a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\n"
      + "a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\n"
      + "a=sendrecv\n"
      + "a=rtcp-mux\n"
      + "a=rtcp-rsize\n"
      + "a=rtpmap:125 H264/90000\n"
      + "a=rtcp-fb:125 goog-remb\n"
      + "a=rtcp-fb:125 transport-cc\n"
      + "a=rtcp-fb:125 ccm fir\n"
      + "a=rtcp-fb:125 nack\n"
      + "a=rtcp-fb:125 nack pli\n"
      + "a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA==\n"
      + "a=ssrc-group:FID 3352097260 3641358891\n"
      + "a=ssrc:3352097260 cname:40sfaMNo7FXkvIla\n"
      + "a=ssrc:3352097260 msid:" + msid + " e0d1a5de-616a-4db8-9bb6-6d38611f052f\n"
      + "a=ssrc:3352097260 mslabel:" + msid + "\n"
      + "a=ssrc:3352097260 label:e0d1a5de-616a-4db8-9bb6-6d38611f052f\n"
      + "a=ssrc:3641358891 cname:40sfaMNo7FXkvIla\n"
      + "a=ssrc:3641358891 msid:" + msid + " e0d1a5de-616a-4db8-9bb6-6d38611f052f\n"
      + "a=ssrc:3641358891 mslabel:" + msid + "\n"
      + "a=ssrc:3641358891 label:e0d1a5de-616a-4db8-9bb6-6d38611f052f\n"
    return { sdp: sdp, type: "offer" };
  }
  function parseSDP(sdp) {
    var sdpList = sdp.split('\n');
    var res = {}
    var v = "", s = "", t = "", bunle = "", msid = "", opus = "", h264 = ""
    sdpList.forEach(element => {
      var e = element;
      if (e.startsWith("v="))
        v = e
      if (e.startsWith("o="))
        o = e
      if (e.startsWith("t="))
        t = e
      if (e.startsWith("a=group:BUNDLE"))
        bunle = e
      if (e.startsWith("a=group:BUNDLE"))
        msid = e
      if (e.startsWith("a=rtpmap") && e.indexOf("opus") > 0)
        opus = e
      if (e.startsWith("a=fmtp") && e.indexOf("packetization-mode=0") > 0)
        h264 = e
      if (e.startsWith("a=fmtp:125 level-asymmetr") && version == "2")
        e = "a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f;sprop-parameter-sets=Z0LAH9oFB+hAAAADAEAAr8gDxgyo,aM48gA=="
      res = res + e + "\n";
    });
  }