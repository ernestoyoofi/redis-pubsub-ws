import { v4 as uuidv4 } from "uuid";
import { WebSocketServer } from "ws";
import Redis from "ioredis";

const port = process.env.PORT || 5060;
const redis_uri = process.env.REDIS_URI || "redis://localhost:6379";
const serverLabel = process.env.SERVER_LABEL || "default";
const redis = new Redis(redis_uri)
const wss = new WebSocketServer({
  port: port,
  host: "0.0.0.0"
});
console.log(`Server websocket: ws://localhost:${port}`)

let clientSub = {};

redis.on("close", (e) => {
  console.log("[Redis]: Close...,", e)
})
redis.subscribe("global", (err, count) => {
  if (err) {
    console.error("[Redis]: Error connect to global channel!");
    process.exit(1);
  }
  console.log("[Redis]: Success sub on global channel (%s)!", count)
})
redis.on("message", (ch, msg) => {
  if (ch === "global") {
    Object.keys(clientSub).forEach(keys => {
      if (
        (
          msg?.startsWith('[System]: User ') &&
          msg?.endsWith('join on chat!') &&
          (String(msg?.split('[System]: User ')[1]?.split('join on chat!')[0]).trim() === keys)
        )
        || (String(msg?.split('[')[1]?.split(']:')[0]).trim() === keys)
      ) return;
      clientSub[keys].send(msg)
    })
  }
})

wss.on("connection", function connection(ws) {
  // Set User
  const userID = uuidv4();
  console.log("[Websocket]: User %s Connected!", userID);
  ws.send(`[System]: Welcome to global chat!, connect at "${serverLabel}"!`);
  ws.send(`[System]: Now, you are ${userID}`);
  redis.publish("global", `[System]: User ${userID} join on chat!`);
  clientSub[userID] = ws;
  // Event Message
  ws.on("message", (data) => {
    const msgtostr = String(data).trim();
    if (msgtostr.length > 250) {
      ws.send(`[System]: Your message exceeds the minimum limit of 250 characters!`)
    } else {
      console.log("[Websocket]: User %s Send Message:", userID, msgtostr);
      redis.publish("global", `[${userID}]: ${msgtostr}`);
    }
  });
  // Event Error
  ws.on("error", (e) => {
    console.error("[Websocket]: Have error:", e);
    redis.publish("global", `[System]: User ${userID} have some error, disconnected...`);
    if (clientSub[userID]) {
      delete clientSub[userID];
    }
  });
  // Event Disconnected
  ws.on("close", (code, reason) => {
    console.log("[Websocket]: User %s disconnect on code %s, reason: %s", userID, code, (reason||"disconnected"));
    redis.publish("global", `[System]: User ${userID} has disconnect`);
    if (clientSub[userID]) {
      delete clientSub[userID];
    }
  })
});