const express = require('express');
const app = express();
require('dotenv').config();
const main = require('./config/db');
const cookierParser = require('cookie-parser');
const router = require('./routes/userauth');
const redisClient = require('./config/redis');
const lostFoundRoutes = require('./routes/lostFoundRoutes'); 

// Middleware
app.use(express.json());

app.use(cookierParser());


app.use('/user',router);
app.use('/user', lostFoundRoutes); 

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

