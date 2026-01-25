const express = require('express');
const app = express();
require('dotenv').config();
const main = require('./config/db');
const cookierParser = require('cookie-parser');

// Middleware
app.use(express());
app.use(cookierParser());


// Connect to the database
main().then(() => {
  app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
  });
}).catch(err => {
    console.error('Database connection error:', err);
});
