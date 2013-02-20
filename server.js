var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.listen(80);

app.get('/', function (req, res)
{
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket)
{
	socket.on('set country', function(name, color, callback)
	{
		console.log("New country:" . name);

		socket.set('country', name);
		socket.set('color', color, function()
		{
			callback('success');
		});
	});
});