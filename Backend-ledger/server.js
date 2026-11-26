require("dotenv").config();

const app = require("./src/app")
const connectToDB = require("./src/config/db");


connectToDB();
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
