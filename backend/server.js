require("dotenv").config()
const http = require("http")
const { Server } = require("socket.io")
const app = require("./src/app")
const connectDB = require("./src/config/database")
const PORT = process.env.PORT || 3000

connectDB();

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
})

app.set("io", io)

io.on("connection", (socket) => {
    socket.on("notifications:join", (userId) => {
        if (!userId) {
            return
        }

        socket.join(`user:${userId}`)
    })

    socket.on("notifications:leave", (userId) => {
        if (!userId) {
            return
        }

        socket.leave(`user:${userId}`)
    })
})

server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
});

