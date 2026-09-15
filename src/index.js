import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { router } from "./routes/routes.js";

dotenv.config({ quiet: true });

const port = 8080;
const app = express();


app.use(express.json());
app.use(cors());
app.use(helmet());


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

app.use("/", router);

mongoose
  .connect(process.env.MongoDBURL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error", err));

    app.listen(port, () => {console.log(`Server is running on port ${port}`);
    });
  

