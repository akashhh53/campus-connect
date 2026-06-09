const express = require('express');
const app = express();
require('dotenv').config();
const main = require('./config/db');
const cookierParser = require('cookie-parser');
const router = require('./routes/userauth');
const redisClient = require('./config/redis');
const lostFoundRoutes = require('./routes/lostFoundRoutes'); 
const feedRoutes = require('./routes/feedRoutes');
const cors = require("cors");


app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        process.env.FRONTEND_URL,
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
// Middleware
app.use(express.json());

app.use(cookierParser());


app.use('/user',router);
app.use('/user', lostFoundRoutes); 
app.use('/user', feedRoutes);   

const InitializeConnection=async()=>{
    try{
       await Promise.all([main(),redisClient.connect()]);
       console.log('Connected to MongoDB and Redis');
         app.listen(process.env.PORT, () => {
         console.log(`Server is running on port ${process.env.PORT}`);
          });
    }
    catch(err){
        console.log(err);
    }
}
InitializeConnection();

