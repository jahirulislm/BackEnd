import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express(); // All the configuration must have been created after the express() app

// config cors
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// config middleware
app.use(express.json({ limit: "16kb" })); // excepting json() with limitss
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // encoding the use char such as "space"

// give access of the files such as "favicon"
app.use(express.static("public"));

// config cookieParser like access the browser cookie and create "CRUD" on the cookies of the user.
app.use(cookieParser());

// exporting the app
export { app };
