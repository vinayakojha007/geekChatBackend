const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.mongo_URL).then(
    ()=>{
        console.log("connected to database");
    }
).catch((err)=>{
    console.log('Error connecting to database ' + err)
})