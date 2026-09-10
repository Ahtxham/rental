import mongoose from "mongoose";

import { DB_URI } from "@/constants/env";
import { LOGUI } from "@/constants/logs";

export const connectDB = async () => {
  try {
    await mongoose.connect(DB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log(LOGUI.FgGreen, "MongoDB connected successfully");
  } catch (error) {
    console.error(LOGUI.FgRed, `MongoDB connection error ${error}`);
    process.exit(1);
  }
};
