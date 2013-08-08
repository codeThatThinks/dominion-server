# Dominion Server

This is the Node.js server back-end for Dominion. Communication between client and server is done via the socket.io module. Game data is stored in memory and routinely saved to Redis.

The client version of the game is available here: https://github.com/codeThatThinks/Dominion.

You can play the pre-alpha here: http://dominion.ianglen.me

# Installing

Dominion-server requires Express, Socket.io, and Redis. Install them with npm:

```
npm install
```

Then start the app.

```
node app.js
```