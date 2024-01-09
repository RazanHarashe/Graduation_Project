const express = require("express");
require("./db/mongoose");
const userRouter = require("./routers/users");
const adminRouter = require("./routers/admin");
app = express();

const port = process.env.PORT;

app.use(express.json());
app.use(userRouter);
app.use(adminRouter);
app.listen(port, () => {
  console.log("Server is running on port " + port);
});
