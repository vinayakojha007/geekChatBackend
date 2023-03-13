const bodyParser = require('body-parser');
const express = require('express');
const port = 3000;
const port1 = 3001;
const app = express();

require('./db');
require('./models/User');
require('./models/Message');

const authRoutes = require('./routes/authRoutes');


//requireToken skipped

const {createServer} = require('http');
const {Server} = require('socket.io');
const httpServer = createServer();
const io = new Server(httpServer,{});

app.use(bodyParser.json())
app.use(authRoutes)
app.get('/',(req,res)=>{
    res.send("Hello world")
})

io.on('connection',(socket)=>{
    console.log("USER CONNECTED - ",socket.id);
    socket.on('disconnect',()=>{
        console.log("USER DISCONNECTED - ",socket.id);
    })

    socket.on("join_room",(data)=>{
       console.log("USER ID WITH - ",socket.id,"JOIN ROOM - ",data.roomid);
       socket.join(data);
    })

    socket.on("send_message",(data)=>{
        console.log("MESSAGE RECIEVED - " ,data);
        io.emit("receive_message",data);
    });


})


httpServer.listen(port1,()=>{
    console.log("Socketio Server is running on port - ",port1);
})
app.listen(port,()=>{
    console.log('Server is running on port ' + port);
})