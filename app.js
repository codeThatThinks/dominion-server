/**********
 * app.js - Dominion server for Node.js
 * Author: Ian Glen <ian@ianglen.me>
 *********/


/**
 * includes
 */
var app = require('express')();
var server = require('http').createServer(app);

var io = require('socket.io').listen(server);

var logentries = require('node-logentries');
var log = logentries.logger(
{
  token:'547b28e2-70c2-4efb-95a4-cd18664cecb3'
});

var mysql = require('mysql');
var db = mysql.createConnection(
{
	host: 'instance39639.db.xeround.com',
	port: 7398,
	user: 'appfog',
	password: 'dominion',
	database: 'dominion',
})


/**
 * configure includes
 */
io.configure(function ()
{
	io.set("transports", ["xhr-polling"]); 
	io.set("polling duration", 10);
	io.set("log level", 2);
});


/**
 * variables
 */
var territory = new Array();
var port = 80;


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

db.connect();

// log errors to logentries
log.on('error', function(err)
{
   log.err(err);
   console.log(err);
});

// handle mysql errors
db.on('error', function(err)
{
	log.err("MySQL Error: " + err);
	console.log("MySQL Error: " + err);

	// reconnect on lost connection
	if (err.code == 'PROTOCOL_CONNECTION_LOST')
	{
		log.info("Reconnecting to MySQL database...");
		console.log("Reconnecting to MySQL database...");

		connection = mysql.createConnection(connection.config);
		connection.connect();
	}
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
		// check if account exists
		var query = db.query('SELECT * FROM users WHERE email = ' + db.escape(email), function(err, result)
		{
			if(err)
			{
				log.err("MySQL Error: " + err);
				console.log("MySQL Error: " + err);
			}

			if(result.length)
			{
				// account exists, continue
				query = db.query('SELECT * FROM users WHERE password = ' + db.escape(password), function(err, result)
				{
					if(err)
					{
						log.err("MySQL Error: " + err);
						console.log("MySQL Error: " + err);
					}

					if(result.length)
					{
						log.info("login: " + email);
						console.log("login: " + email);

						// password works, return true
						socket.emit('loginEvent', true);
					}
					else
					{
						log.info("failed login: " + email);
						console.log("failed login: " + email);

						socket.emit('loginEvent', false);
					}
				});
			}
			else
			{
				// doesn't exist, create account
				query = db.query('INSERT INTO users (email, password) VALUES (' + db.escape(email) + ', ' + db.escape(password) + ')', function(err)
				{
					if(err)
					{
						log.err("MySQL Error: " + err);
						console.log("MySQL Error: " + err);
					}

					log.info("new account: " + email);
					console.log("new account: " + email);

					// account created, everything good
					socket.emit('loginEvent', true);
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