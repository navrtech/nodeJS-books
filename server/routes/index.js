const path = require("path");

const apiToken = (req, res, next) => {
  const token = req.get("G-TOKEN");
  if (token === "ITEXPS") {
    next();
  } else {
    res.status(403).end();
  }
};

module.exports = (app) => {
  app.get("/ui", (req, res) => {
    res.sendFile(path.join(__dirname, "../", "index.html"));
  });

  app.get("/landing", (req, res) => {
    res.sendFile(path.join(__dirname, "../", "landing.html"));
  });

  app.use(apiToken);

};