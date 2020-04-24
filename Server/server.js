const path = require('path');
const http = require('http')
const express = require('express');
const socketIO = require('socket.io')

const {generateMeassage , generateLocationMessage , generateImage} = require('./utils/message')
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users')
const publicPath = path.join(__dirname , '../public');
const port = process.env.PORT || 3000;

var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(publicPath))

io.on('connection' , (socket) => {
  console.log('New user connected');

  
  socket.on('join', (params , callback) => {
    if (!isRealString(params.name) || !isRealString(params.room)) {
      return callback('Name and room name are required')
    }
    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id , params.name , params.room);

    io.to(params.room).emit('updateUserList' , users.getUserList(params.room));
    socket.emit('newMessage' , generateMeassage('Admin', 'Welcome to the chat app'));
    socket.broadcast.to(params.room).emit('newMessage' , generateMeassage('Admin' , `${params.name} has joined`));
  
    callback();
  })
  socket.on('createMessage' , (message , callback) => {
    var user = users.getUser(socket.id);

    if (user && isRealString(message.text)){
      io.to(user.room).emit('newMessage' , generateMeassage(user.name , message.text));
    }
    callback('This is from the server');
  });
  socket.on('createLocationMessage', (coords) => {
    var user = users.getUser(socket.id);
    if (user){
    io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
    }
  });
socket.on('image' , (message) => {
  var user = users.getUser(socket.id);

    if (user){
      socket.broadcast.to(user.room).emit('newImageMessage' , generateImage(user.name , message.data));
    }
})
  socket.on('disconnect' , () => {
    console.log('user was disconnected');
    var user = users.removeUser(socket.id);
    if (user) {
      io.to(user.room).emit('updateUserList' , users.getUserList(user.room));
      io.to(user.room).emit('newMessage' , generateMeassage('Admin' , `${user.name} has left`));
    }
  });
  
});


server.listen(port, () => {
    console.log(`Started up at port ${port}`);
  });