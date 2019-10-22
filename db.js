var Connection = require("tedious").Connection;
require("dotenv").config();

var config = {
  server: "studentportfolio.database.windows.net",
  authentication: {
    type: "default",
    options: {
      userName: process.env.USER,
      password: process.env.PASS
    }
  },
  options: {
    database: "studentsportfolio"
  }
};

var connection = new Connection(config);
connection.on("connect", err => {
  if (err) console.log("diopor");
  else console.log("connected");
});

module.exports = connection;
