const express = require("express");
require("./db/mongoose");

app = express();
const port = process.env.PORT;
app.use(express.json());
app.listen(port, () => {
  console.log("Server is running on port " + port);
});
