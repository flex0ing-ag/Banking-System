const mongoose = require("mongoose");

async function connectToDB(retries = 0) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message || err);
    if (err.reason) console.error("Topology reason:", err.reason);
    // Don't exit immediately — retry a few times to allow transient network fixes
    if (retries < 5) {
      const delay = 5000;
      console.log(
        `Retrying connection in ${delay / 1000}s (attempt ${retries + 1}/5)...`,
      );
      setTimeout(() => connectToDB(retries + 1), delay);
    } else {
      console.error(
        "Exceeded retry attempts. Please check Atlas IP access and network settings.",
      );
    }
  }
}

module.exports = connectToDB;
