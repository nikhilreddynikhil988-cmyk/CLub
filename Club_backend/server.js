import express from "express";
import cors from "cors";
import "dotenv/config.js";
import connectDB from "./config/mongodb.js";
import userRouter from "./routes/userRouter.js";
import eventRouter from "./routes/eventRouter.js"; 
import teamRouter from "./routes/teamRouter.js"; 
import analyticsRouter from "./routes/analyticsRouter.js"; 

const app = express();
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();
    app.use(express.json()); 
    app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      optionsSuccessStatus: 200
    }));

  
    app.use("/api/users", userRouter);
    app.use("/api/events", eventRouter);
    app.use("/api/teams", teamRouter);
    app.use("/api/analytics", analyticsRouter);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();