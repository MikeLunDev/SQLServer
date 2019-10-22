const express = require("express");
const bodyParser = require("body-parser");
const productRouter = require("./services/");
const cors = require("cors");
const { join } = require("path");
const listRoutes = require("express-list-endpoints");
require("dotenv").config();

const connection = require("./db");

const server = express();
server.set("port", process.env.PORT || 3450);
server.use("/image/", express.static(join(__dirname, "./public/imgs")));
console.log(join(__dirname, "./public/imgs"));
server.use(bodyParser.json());

server.use("/products", cors(), productRouter);
console.log(listRoutes(server));
server.listen(server.get("port"), () => {
  console.log("SERVER IS RUNNING ON " + server.get("port"));
});
