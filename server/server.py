from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room
import ssl
import eventlet
import eventlet.wsgi

app = Flask(__name__)
app.secret_key = 'c02912516684db8d91c8c236'
socketio = SocketIO(app=app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# TODO: Add SSL certs
# TODO: Add more socket events (i.e. disconnect, etc...)

# event handler for the 'join' event
# get their username and room info. Join the room
@socketio.on('join')
def join(message):
    username = message['username']
    room = message['room']
    join_room(room=room)
    print(f'RoomEvent: {username} has joined room {room}\n')
    emit('ready', {username: username}, to=room, skip_sid=request.sid)
    
@socketio.on('data')
def transfer_data(message):
    username = message['username']
    room = message['room']
    data = message['data']
    print(f'DataEvent: {username} has sent data: \n{data}\n')
    emit('data', data, to=room, skip_sid=request.sid)
    
@socketio.on_error_default
def default_error_handler(e):
    print(f'Error: {e}')
    socketio.stop()

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=9000)