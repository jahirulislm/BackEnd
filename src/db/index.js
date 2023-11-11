import mongoose from "mongoose";
/*use "ASYNC" because it alwasys takes time and use "TRYCATCH" To handle problems(error) while connecting DB */
// impoting dbname from constant
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    // getting db url and bd name from .env
    const connetionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log(`\n Mongodb Connected ~~ DB Host: ${connetionInstance}`);

    console.log(connetionInstance.connection.host);
  } catch (error) {
    console.log("Mongodb connection Failed: ", error);

    process.exit(1);
  }
};

export default connectDB;
