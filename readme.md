# Dominion
Claim territory, wage war, and become powerful. Still extremely early in development.
  
You can play the pre-alpha here: [http://dominion.ianglen.me](http://dominion.ianglen.me)

----

This is the Node.js server back-end for the game. Communication between client and server is done via the socket.io module. Game data is store in a MySQL database.

The client version of the game is available here: [https://github.com/codeThatThinks/Dominion](https://github.com/codeThatThinks/Dominion).

## Required modules

Dominion-server requires Express, Socket.io, and MySQL. Install them with npm:

```
npm install -g express socket.io mysql
```