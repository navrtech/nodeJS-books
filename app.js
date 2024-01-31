const express = require("express");
const logger = require("morgan");
const jsonServer = require("json-server");
const url = require("url");
const env = process.env.NODE_ENV || "development";
const { flatten } = require("ramda");

const server = jsonServer.create();
const router =
  env === "test"
    ? jsonServer.router("db.test.json")
    : jsonServer.router("db.json");

const middlewares = jsonServer.defaults();

server.use(middlewares);

server.use(logger("dev"));

server.use(express.json());
server.use(express.urlencoded({ extended: false }));

require("./server/routes/")(server, express);

function isAuthorized(req) {
  if (req.headers.authorization) {
    const user_and_password = new Buffer.from(
      req.headers.authorization.split(" ")[1],
      "base64"
    ).toString();

    const user = user_and_password.split(":")[0];
    const pw = user_and_password.split(":")[1];

    return (
      user === "admin" &&
      ((env === "test" && pw === "admin_test") || pw === "admin")
    );
  } else {
    return false;
  }
}

const bookRouteNeedsAuth = (req) =>
  req.url.match(/books/) && (req.method === "DELETE" || req.method === "PUT");

const userRouteNeedsAuth = (req) =>
  req.url.match(/users/) && req.method === "DELETE";

server.use((req, res, next) => {
  if (
    (bookRouteNeedsAuth(req) || userRouteNeedsAuth(req)) &&
    !isAuthorized(req)
  ) {
    res.sendStatus(401);
  } else {
    next();
  }
});

server.use((req, res, next) => {
  if (req.method === "POST") {
    if ((req.path === "/books" || req.path === "/books/") && !req.body.title) {
      res.status(500).send({ error: "Title cannot be null" });
      return;
    }
    req.body.createdAt = new Date().toISOString();
    req.body.updatedAt = new Date().toISOString();
    next();
  } else if (req.method === "PUT") {
    req.body.updatedAt = new Date().toISOString();
    req.method = "PATCH";
    next();
  } else {
    next();
  }
});

function fullUrl(req) {
  return url.format({
    protocol: req.protocol,
    host: req.get("host"),
    pathname: req.originalUrl,
  });
}

router.render = (req, res) => {
  if (req.method === "DELETE") {
    res.status(204);
  }
  res.jsonp(res.locals.data);
};


server.get("/books/search", (req, res) => {
  const db = router.db;

  const books = db
    .get("books")
    .filter(
      (r) =>
        (req.query.title
          ? r.title.toLowerCase().includes(req.query.title.toLowerCase())
          : true) &&
        (req.query.author
          ? r.author.toLowerCase().includes(req.query.author.toLowerCase())
          : true)
    )
    .value();

  res.status(200).send(books);
});

server.use(router);

server.get("*", (req, res) => res.status(404).send());

server.listen(process.env.PORT || 80, () => {
  console.log(`Server running: ${process.env.PORT || 80}`);
});

module.exports = server;
