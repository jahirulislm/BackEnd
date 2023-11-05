// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";

//import the db name from constant
// import { DB_NAME } from "./constants";

import express from "express";
import connectDB from "./db/index.js";

// configure the dotenv
dotenv.config({
  path: "./env",
});

// connecting the db by callilng and executing function from db/index.js
connectDB();

/*
const app = express()(
  // IFI of js
  async () => {
    try {
      const connectDatabase = await mongoose.connect(
        `${process.env.MONGODB_URL}/${DB_NAME}`
      );

      // listen event
      app.on("error", (error) => {
        console.log("Error: ", error);
      });

      // start the app on port
      app.listen(process.env.PORT, () => {
        console.log(`App is listening on Port${process.env.PORT}`);
      });
    } catch (error) {
      console.error("ERROR : ", error);
    }
  }
)();
*/
