var app = require('express')();
var server = require('http').createServer(app);

var io = require('socket.io').listen(server);

var logentries = require('node-logentries');
var log = logentries.logger({
  token:'547b28e2-70c2-4efb-95a4-cd18664cecb3'
});

/* configure socket.io */
io.configure(function ()
{
	io.set("transports", ["xhr-polling"]); 
	io.set("polling duration", 10); 
});

/* variables */
var territory = new Array();
var port = 80;

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

server.listen(port);
log.info('Listening on port ' + port);
console.log('Listening on port ' + port);

app.get('/', function (req, res)
{
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket)
{
	socket.on('setup', function(country, color, callback)
	{
		socket.set('country', country, function()
		{
			socket.set('color', color, function()
			{
				log.info("addCountry(): " + country + ", " + color);
				console.log("addCountry(): " + country + ", " + color);
				socket.broadcast.emit('addCountry', country, color);
			});
		});

		callback('success');
	});

	socket.on('disconnect', function()
	{
		log.info("removeCountry(): " + socket.get('country'));
		console.log("removeCountry(): " + socket.get('country'));

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
		socket.get('country', function(err, country)
		{
			log.info("claim(): " + country + " claimed point(" + x + "," + y + ")");
			console.log("claim(): " + country + " claimed point(" + x + "," + y + ")");
			territory.push(new territoryUnit(new Point(x,y), country));
			socket.broadcast.emit('claim', x, y, country);
		});
	});

	socket.on('unclaim', function(x, y)
	{
		socket.get('country', function(err, country)
		{
			log.info("unclaim(): " + country + " unclaimed point(" + x + "," + y + ")");
			console.log("unclaim(): " + country + " unclaimed point(" + x + "," + y + ")");

			for(var n = 0; n < territory.length; n++)
			{
				if(territory[n].country == country && territory[n].point.x == x && territory[n].point.y == y)
				{
					territory.splice(n, 1);
					socket.broadcast.emit('unclaim', x, y, counstry);
				}
			}
		});
	});
});