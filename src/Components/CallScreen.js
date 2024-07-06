import { useParams } from "react-router-dom";
import { useRef, useEffect, useCallback } from "react";
import { useRef, useEffect, useCallback } from "react";
import socketio from "socket.io-client";
import "./CallScreen.css";

// TODO: Add custom STUN servers

export default function CallScreen() {
  const params = useParams();
  const localUsername = params.username;
  const roomName = params.room;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConn = useRef(null);
  const peerConn = useRef(null);

  // socketio connection to our local signaling server
  const socket = socketio("https://localhost:9000", {
    autoConnect: false,
  });

  // fn to send data to server
  const sendData = useCallback(
    (data) => {
      socket.emit("data", {
        username: localUsername,
        room: roomName,
        data: data,
      });
    },
    [localUsername, roomName, socket]
  );
  const sendData = useCallback(
    (data) => {
      socket.emit("data", {
        username: localUsername,
        room: roomName,
        data: data,
      });
    },
    [localUsername, roomName, socket]
  );

  const startConnection = useCallback(() => {
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
  }, [localUsername, roomName, socket]);
  }, [localUsername, roomName, socket]);

  const onIceCandidate = useCallback(
    (event) => {
      if (event.candidate) {
        // console.log(event.candidate);
        console.log("Sending ICE candidate");
        sendData({
          type: "candidate",
          candidate: event.candidate,
        });
      }
    },
    [sendData]
  );
  const onIceCandidate = useCallback(
    (event) => {
      if (event.candidate) {
        // console.log(event.candidate);
        console.log("Sending ICE candidate");
        sendData({
          type: "candidate",
          candidate: event.candidate,
        });
      }
    },
    [sendData]
  );

  const onTrack = useCallback((event) => {
  const onTrack = useCallback((event) => {
    console.log("Adding remote track");
    remoteVideoRef.current.srcObject = event.streams[0];
  }, []);
  }, []);

  const createPeerConnection = useCallback(() => {
  const createPeerConnection = useCallback(() => {
    try {
      const newPeerConn = new RTCPeerConnection({}); // create RTCPeerConnection obj
      newPeerConn.onicecandidate = onIceCandidate; // handle OnInceCandidate event and send to server
      newPeerConn.ontrack = onTrack; // handle onTrack event and set remote vid
      const newPeerConn = new RTCPeerConnection({}); // create RTCPeerConnection obj
      newPeerConn.onicecandidate = onIceCandidate; // handle OnInceCandidate event and send to server
      newPeerConn.ontrack = onTrack; // handle onTrack event and set remote vid

      const localStream = localVideoRef.current.srcObject;
      if (localStream) {
        for (const track of localStream.getTracks()) {
          newPeerConn.addTrack(track, localStream); // add our track to the peerConn for the remote user
          newPeerConn.addTrack(track, localStream); // add our track to the peerConn for the remote user
        }
      }
      peerConn.current = newPeerConn;
      peerConn.current = newPeerConn;
      console.log("PeerConnection created");
    } catch (error) {
      console.error("PeerConnection failed: ", error);
    }
  }, [onIceCandidate, onTrack]);

  // set our local SDP and send it to the server to be broadcasted
  const setAndSendLocalDescription = useCallback(
    useCallback(
    (sessionDescription) => {
        peerConn.current.current.setLocalDescription(sessionDescription);
      console.log("SDP", sessionDescription);
        console.log("Local SDP set");
      console.log(peerConn.current);
        sendData(sessionDescription);
      },
    [sendData]
  ),
    [sendData]
  );

  // create our SDP offer
  const sendOffer = useCallback(() => {
    console.log("Sending offer");
    peerConn.current.createOffer().then(setAndSendLocalDescription, (error) => {
      console.error("Send offer failed: ", error);
    });
  }, [setAndSendLocalDescription]);

  // send our answer (remote SDP) to an offer
  const sendAnswer = useCallback(() => {
    console.log("Sending answer");
    peerConn.current
      .createAnswer()
      .then(setAndSendLocalDescription, (error) => {
        console.error("Send answer failed: ", error);
      });
  }, [setAndSendLocalDescription]);

  const signalingDataHandler = useCallback(
    (data) => {
      // if we get an offer, create a peer connection and set remote SDP and send answer
      if (data.type === "offer") {
        createPeerConnection();
        peerConn.current.setRemoteDescription(new RTCSessionDescription(data));
        sendAnswer();
      } else if (data.type === "answer") {
        // if an answer, set remote SDP
        peerConn.current.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === "candidate") {
        // if data is an ICE candidate, add it to our list of candidates
        peerConn.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        console.log("Unknown Data");
      }
    },
    [createPeerConnection, sendAnswer]
  );

  useEffect(() => {
    startConnection();

    // on ready start a peer connection
    socket.on("ready", () => {
      console.log("Ready to Connect!");
      createPeerConnection();
      sendOffer();
    });
    console.log(peerConn.current);

    // on a data signal, pass it to signal handler
    socket.on("data", (data) => {
      console.log("Data received: ", data);
      signalingDataHandler(data);
    });

    return function cleanup() {
      if (peerConn.current) {
        peerConn.current.close();
        console.log("PeerConnection closed");
      }
    };
  }, [
    startConnection,
    createPeerConnection,
    sendOffer,
    signalingDataHandler,
    socket,
  ]);

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
