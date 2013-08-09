/**********
 * app.js - Dominion server for Node.js
 * Author: Ian Glen <ian@ianglen.me>
 *********/

/**
 * objects
 */
function Country(name, color)
{
	this.name = name;
	this.color = color;
}

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

var territory = new Array();
var port = 3000;

var app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	redis = require("redis"),
	db = redis.createClient(),
	logentries = require('node-logentries'),
	log = logentries.logger({token:'92ba2453-5849-4403-80f3-1eaec6ca2158'});

io.configure(function ()
{
	io.set("log level", 2);
});

/**
 * setup
 */
server.listen(port);
log.info('Listening on port ' + port);
console.log('Listening on port ' + port);

app.get('/', function (req, res)
{
	res.sendfile(__dirname + '/index.html');
});

// log errors to logentries
log.on('error', function(err)
{
   log.err("Logentries: " + err);
   console.log("Logentries Error: " + err);
});

// handle mysql errors
db.on('error', function(err)
{
	log.err("Redis: " + err);
	console.log("Redis Error: " + err);
});


/**
 * events
 */
io.sockets.on('connection', function(socket)
{
	// when client connects for first time
	socket.on('setup', function(country, color)
	{
		var colorParsed = JSON.parse(color);

		socket.set('country', country, function()
		{
			socket.set('color', colorParsed, function()
			{
				log.info(country + ": addCountry() with color " + colorParsed);
				console.log(country + ": addCountry() with color " + colorParsed);
				socket.broadcast.emit('addCountry', country, color);
			});
		});

		// prepare and send countries array
		var countriesArray = new Array();

		for(var n = 0; n < io.sockets.clients().length; n++)
		{
			io.sockets.clients()[n].get('country', function(err, arrayCountry)
			{
				io.sockets.clients()[n].get('color', function(err, arrayColor)
				{
					countriesArray.push(new Country(arrayCountry, arrayColor));
				});
			});
		}

		log.info(country + ": send existing countries");
		console.log(country + ": send existing countries");

		socket.emit('sendCountries', JSON.stringify(countriesArray));
	});

		// client received countries, now send Territory
		socket.on('sendCountriesSuccess', function()
		{
			socket.get('country', function(err, country)
			{
				log.info(country + ": send existing territory");
				console.log(country + ": send existing territory");

				log.debug("JSON.stringify(territory): " + JSON.stringify(territory));

				socket.emit('sendTerritory', JSON.stringify(territory));
			});
		});

	// when client logs in
	socket.on('login', function(email, password)
	{
		// check if username exists
		db.exists("username:" + email, function(err, result)
		{
			if(result == 1)
			{
				// username exists, check if password matches
				db.get("username:" + email + ":password", function(err, result)
				{
					if(err)
					{
						log.err("Redis: " + err);
						console.log("Redis Error: " + err);
					}

					if(password == result)
					{
						// password matches, so login is correct
						log.info("<" + email + "> logged in");
						console.log("<" + email + "> logged in");

						socket.emit('loginEvent', true);
					}
					else
					{
						// password doesn't match, so login is incorrect
						log.info("<" + email + "> failed login");
						console.log("<" + email + "> failed login");

						socket.emit('loginEvent', false);
					}
				});
			}
			else
			{
				// username doesn't exist, create an account
				db.set("username:" + email, email, function(err, result)
				{
					if(err)
					{
						log.err("Redis: " + err);
						console.log("Redis Error: " + err);
					}

					db.set("username:email:password", password, function(err, result)
					{
						if(err)
						{
							log.err("Redis: " + err);
							console.log("Redis Error: " + err);
						}

						log.info("<" + email + "> account created");
						console.log("<" + email + "> account created");

						// account creation successful
						socket.emit('loginEvent', true);
					});
				});
			}
		});
	});

	// when client claims territory
	socket.on('claim', function(x, y)
	{
		socket.get('country', function(err, country)
		{
			log.info(country + ": claimed point(" + x + "," + y + ")");
			console.log(country + ": claimed point(" + x + "," + y + ")");

			territory.push(new territoryUnit(new Point(x,y), country));

			// let other clients know
			socket.broadcast.emit('claim', x, y, country);
		});
	});

		// when client unclaims territory
		socket.on('unclaim', function(x, y)
		{
			socket.get('country', function(err, country)
			{
				log.info(country + ": unclaimed point(" + x + "," + y + ")");
				console.log(country + ": unclaimed point(" + x + "," + y + ")");

				for(var n = 0; n < territory.length; n++)
				{
					if(territory[n].country == country && territory[n].point.x == x && territory[n].point.y == y)
					{
						territory.splice(n, 1);

						// let other countries know
						socket.broadcast.emit('unclaim', x, y, country);
					}
				}
			});
		});


	// when client disconnects
	socket.on('disconnect', function()
	{
		socket.get('country', function(err, country)
		{
			// unclaim all territory for that country
			for(var n = territory.length - 1; n >= 0; n--)
			{
				if(territory[n].country == country)
				{
					territory.splice(n, 1);
				}
			}

			log.info(country + ": removeCountry()");
			console.log(country + ": removeCountry()");

			// let other clients know
			socket.broadcast.emit('removeCountry', country);
		});
	});
});