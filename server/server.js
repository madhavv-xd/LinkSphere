require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const app = require("./app");
const { connectDB } = require("./database/db");

// Handle connection errors after the initial connection
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB runtime error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB connection lost.");
});

const PORT = process.env.PORT || 8000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
});

app.set("io", io);

const voiceRooms = {}; // Global state to track voice channel participants


io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.user = decoded; // Attach the decoded user data (id, username) to the socket instance
    next();
  });
});

io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id} (User: ${socket.user.username})`);

  socket.on("join_channel", (channelId) => {
    socket.join(channelId);
    console.log(`Socket ${socket.id} joined channel: ${channelId}`);
  });

  socket.on("leave_channel", (channelId) => {
    socket.leave(channelId);
    console.log(`Socket ${socket.id} left channel: ${channelId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
    
    // Remove user from any voice rooms they were in
    let roomsUpdated = false;
    for (const channelId in voiceRooms) {
      const initialLength = voiceRooms[channelId].length;
      voiceRooms[channelId] = voiceRooms[channelId].filter((u) => u.socketId !== socket.id);
      
      if (voiceRooms[channelId].length < initialLength) {
        roomsUpdated = true;
        // Let other users in that voice channel know this user left (to clean up WebRTC connections)
        socket.to(`voice_${channelId}`).emit("user_left_voice", socket.id);
        
        if (voiceRooms[channelId].length === 0) {
          delete voiceRooms[channelId];
        }
      }
    }
    
    if (roomsUpdated) {
      io.emit("voice_rooms_update", voiceRooms);
    }
  });

  socket.on("join_voice", (channelId) => {
    if (!voiceRooms[channelId]) voiceRooms[channelId] = [];
    
    // Check if user is already in this channel with this socket
    const exists = voiceRooms[channelId].find((u) => u.socketId === socket.id);
    if (!exists) {
      const userObj = {
        socketId: socket.id,
        userId: socket.user.id,
        username: socket.user.username,
        avatarUrl: socket.user.avatarUrl
      };
      voiceRooms[channelId].push(userObj);
      
      socket.join(`voice_${channelId}`);
      
      // Tell everyone in all channels about the updated room list
      io.emit("voice_rooms_update", voiceRooms);
      
      // Get other users in this specific voice channel to send back to joining user
      const others = voiceRooms[channelId].filter((u) => u.socketId !== socket.id);
      socket.emit("voice_users", others);
    }
  });

  socket.on("leave_voice", (channelId) => {
    if (voiceRooms[channelId]) {
      voiceRooms[channelId] = voiceRooms[channelId].filter((u) => u.socketId !== socket.id);
      
      socket.leave(`voice_${channelId}`);
      socket.to(`voice_${channelId}`).emit("user_left_voice", socket.id);
      
      if (voiceRooms[channelId].length === 0) {
        delete voiceRooms[channelId];
      }
      
      io.emit("voice_rooms_update", voiceRooms);
    }
  });

  socket.on("webrtc_signal", (data) => {
    // data = { targetSocketId, signalData }
    io.to(data.targetSocketId).emit("webrtc_signal", {
      fromSocketId: socket.id,
      signalData: data.signalData,
    });
  });
});

// Connect to MongoDB Atlas first, then start the HTTP server
connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB Atlas:", err);
    process.exit(1);
  });
