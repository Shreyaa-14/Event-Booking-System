const bcrypt = require("bcryptjs");

bcrypt.hash("halo123", 12).then(hash => {
  console.log(hash);
});