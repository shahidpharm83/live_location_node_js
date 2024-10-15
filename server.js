const express = require('express');
const cors = require('cors');

const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(cors({ origin: 'https://live-location-node-js.onrender.com/' }));

// Serve static files (HTML, CSS, JS) from the "public" folder
// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for location updates from the Flutter client
    socket.on('locationUpdate', (data) => {
       console.log('Location update received from Flutter:', data);

         // Decode base64 image
    // const imageBuffer = Buffer.from(data.username, 'base64');
    // const imagePath = path.join(__dirname, 'uploads', `${data.userimage}_image.png`);

    // // Save the image on the server
    // fs.writeFile(imagePath, imageBuffer, (err) => {
    //   if (err) throw err;
    //   console.log('Image saved!');
    //     // Broadcast the location update to all connected clients
    //     io.emit('locationUpdate', data);
    //      // Log after emitting
    //         console.log('Location update emitted successfully');
    // });
      io.emit('locationUpdate', data);
         // Log after emitting
           console.log('Location update emitted successfully');
});
});
// io.on('connection', (socket) => {
//     console.log('A user connected:', socket.id);

//   socket.on('locationUpdate', (data) => {
//     const { userName, userImage, locationData } = data;
        // console.log('Location update received from Flutter:', data);


//     // Decode base64 image
//     const imageBuffer = Buffer.from(userName, 'base64');
//     const imagePath = path.join(__dirname, 'uploads', `${userName}_image.png`);

//     // Save the image on the server
//     fs.writeFile(imagePath, imageBuffer, (err) => {
//       if (err) throw err;
//       console.log('Image saved!');

//       // Emit the data back to all clients to update the marker on the map
//       io.emit('locationUpdate', {
//         userImage,
//         imagePath,
//         locationData,
//       });
//             console.log('User data emitted successfully');

//     });
//   });
// });

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
