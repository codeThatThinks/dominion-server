var app = require('express')();
var server = require('http').createServer(app);

var io = require('socket.io').listen(server);

var logentries = require('node-logentries');
var log = logentries.logger({
  token:'1921f70f-d889-485a-b0df-0688f6584691'
});

/* variables */
var territory = new Array();

/* objects */
function Point(x, y)
{
	function set(newX, newY)
	{
		this.x = newX;
		this.y = newY;
	}

	this.x = x;
	this.y = y;
	this.set = set;
}

function territoryUnit(point, country)
{
	this.point = point;
	this.country = country;
}

server.listen(80);

io.sockets.on('connection', function(socket)
{
	socket.on('connect', function(country, color, callback)
	{
		socket.set('country', country, function()
		{
			socket.set('color', color, function()
			{
				log.info("addCountry(): " + socket.get('country') + ", " + socket.get('color'));
				socket.broadcast.emit('addCountry', socket.get('country'), socket.get('color'));
				callback('success');
			});
		});
	});

	socket.on('disconnect', function()
	{
		log.info("removeCountry(): " + socket.get('country'));
		
		// unclaim all territory for that country
		for(var n = 0; n < territory.length; n++)
		{
			if(territory[n].country == socket.get('country'))
			{
				territory.splice(n, 1);
				unclaim(territory[n].point.x, territory[n].point.y, socket.get('country'));
			}
		}

		socket.broadcast.emit('removeCountry', socket.get('country'));
	});

	socket.on('claim', function(x, y)
	{
		log.info("claim(): " + socket.get('country') + " claimed point(" + x + "," + y + ")");
		territory.push(new territoryUnit(new Point(x,y), socket.get('country')));
		socket.broadcast.emit('claim', x, y, socket.get('country'));
	});

	socket.on('unclaim', function(x, y)
	{
		log.info("unclaim(): " + socket.get('country') + " unclaimed point(" + x + "," + y + ")");
		for(var n = 0; n < territory.length; n++)
		{
			if(territory[n].country == socket.get('country'))
			{
				territory.splice(n, 1);
				unclaim(territory[n].point.x, territory[n].point.y, socket.get('country'));
			}
		}
	});
});