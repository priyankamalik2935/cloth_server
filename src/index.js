import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import {router} from './routes/routes.js'


dotenv.config ({quiet:true})


const port=8080
const app=express()
app.use(express.json())
app.use (cors())

mongoose.connect(process.env.MongoDBURL)
.then(()=>console.log("mongodb connected"))
.catch((err)=>console.log(err))

app.use('/',router)
app.listen(port,()=>console.log(`Server is running now${port}`))
