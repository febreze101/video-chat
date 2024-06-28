import { useParams } from "react-router-dom";
import { useRef, useEffect } from "react";
import socketio from "socket.io-client";
import "./CallScreen.css";

// TODO: Add custom STUN servers

export default function CallScreen() {
  const params = useParams();
  const localUsername = params.username;
  const roomName = params.room;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // socketio connection to our local signaling server
  const socket = socketio("http://localhost:9000", {
    autoConnect: false,
  });

  // RTCPeerConnection Object
  let peerConn;

  // fn to send data to server
  const sendData = (data) => {
    socket.emit("data", {
      username: localUsername,
      room: roomName,
      data: data,
    });
  };

  const startConnection = () => {
    // get our media devices
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: {
          height: 500,
          width: 500,
        },
      }) // put our video in the videoRef
      .then((stream) => {
        console.log("Local Stream found");
        localVideoRef.current.srcObject = stream;
        socket.connect();
        socket.emit("join", { username: localUsername, room: roomName });
      }) // error handling
      .catch((error) => {
        console.error("Stream not found: ", error);
      });
  };

  const onIceCandidate = (event) => {
    if (event.candidate) {
      console.log(event.candidate);
      console.log("Sending ICE candidate");
      sendData({
        type: "candidate",
        candidate: event.candidate,
      });
    }
  };

  const onTrack = (event) => {
    console.log("Adding remote track");
    remoteVideoRef.current.srcObject = event.streams[0];
  };

  const CreatePeerConnection = () => {
    try {
      peerConn = new RTCPeerConnection({}); // create RTCPeerConnection obj
      peerConn.onicecandidate = onIceCandidate; // handle OnInceCandidate event and send to server
      peerConn.ontrack = onTrack; // handle onTrack event and set remote vid

      const localStream = localVideoRef.current.srcObject;
      if (localStream) {
        for (const track of localStream.getTracks()) {
          peerConn.addTrack(track, localStream); // add our track to the peerConn for the remote user
        }
      }
      console.log("PeerConnection created");
    } catch (error) {
      console.error("PeerConnection failed: ", error);
    }
  };

  // set our local SDP and send it to the server to be broadcasted
  const setAndSendLocalDescription = (sessionDescription) => {
    peerConn.setLocalDescription(sessionDescription);
    console.log("Local SDP set");
    sendData(sessionDescription);
  };

  // create our SDP offer
  const sendOffer = () => {
    console.log("Sending offer");
    peerConn.createOffer().then(setAndSendLocalDescription, (error) => {
      console.error("Send answer failed: ", error);
    });
  };

  // send our answer (remote SDP) to an offer
  const sendAnswer = () => {
    console.log("Sending answer");
    peerConn.createAnswer().then(setAndSendLocalDescription, (error) => {
      console.error("Send answer failed: ", error);
    });
  };

  const signalingDataHandler = (data) => {
    // if we get an offer, create a peer connection and set remote SDP and send answer
    if (data.type === "offer") {
      CreatePeerConnection();
      peerConn.setRemoteDescription(new RTCSessionDescription(data));
      sendAnswer();
    } else if (data.type === "answer") {
      // if an answer, set remote SDP
      peerConn.setRemoteDescription(new RTCSessionDescription(data));
    } else if (data.type === "candidate") {
      // if data is an ICE candidate, add it to our list of candidates
      peerConn.addIceCandidate(new RTCIceCandidate(data.candidate));
    } else {
      console.log("Unknown Data");
    }
  };

  // on ready start a peer connection
  socket.on("ready", () => {
    console.log("Ready to Connect!");
    CreatePeerConnection();
    sendOffer();
  });

  // on a data signal, pass it to signal handler
  socket.on("data", (data) => {
    console.log("Data received: ", data);
    signalingDataHandler(data);
  });

  useEffect(() => {
    startConnection();
    return function cleanup() {
      peerConn?.close();
    };
  }, []);

  return (
    <>
      <div>
        <label>{"Username: " + localUsername}</label>
        <label>{"Room Id: " + roomName}</label>
        <video autoPlay muted playsInline ref={localVideoRef} />
        <video autoPlay muted playsInline ref={remoteVideoRef} />
      </div>
    </>
  );
}
