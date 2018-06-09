/* jshint esversion: 6 */
/* jshint ignore: start */
// Module dependencies
import fs from 'fs';
import LineByLineReader from 'line-by-line';
import express from 'express';
import mysql from 'mysql';
import bodyParser from  'body-parser';
import multer from  'multer';
import compression from  'compression';
import helmet from  'helmet';

// Globals

var app = express();
app.use( compression() );
app.use( helmet() );
var urlencodedParser = bodyParser.urlencoded( { extended: false } );
var jsonParser = bodyParser.json();

// Database connection

//mysql://bf625d1cf3ab45:6d68558b@us-cdbr-iron-east-04.cleardb.net/heroku_b2cf77a96af7a57?reconnect=true
var mysqlHostName = 'us-cdbr-iron-east-04.cleardb.net';
var mysqlUserName = 'bf625d1cf3ab45';
var mysqlUserPassword = '6d68558b';
var mysqlDatabase = 'heroku_b2cf77a96af7a57';

/*var mysqlConnection = mysql.createConnection({
	host: mysqlHostName,
	user: mysqlUserName,
	password: mysqlUserPassword,
	database: mysqlDatabase,
	ssl: {
		ca: fs.readFileSync( `${__dirname}/mysql/cleardb-ca.pem` ),
		key: fs.readFileSync( `${__dirname}/mysql/bf625d1cf3ab45-key.pem` ),
		cart: fs.readFileSync( `${__dirname}/mysql/bf625d1cf3ab45-cert.pem` )
	}
});
	
// Test connection

mysqlConnection.connect( error => {
	if ( error ) throw error;

	console.log( `Connected to ${mysqlHostName} MySQL database as user ${mysqlUserName}.` );
	mysqlConnection.end();
});*/

console.log( fs.readFileSync( `${__dirname}/mysql/cleardb-ca.pem` ) );
console.log( fs.readFileSync( `${__dirname}/mysql/bf625d1cf3ab45-key.pem` ) );
console.log( fs.readFileSync( `${__dirname}/mysql/bf625d1cf3ab45-cert.pem` ) );

var mysqlPool = mysql.createPool({
	connectionLimit: 100,
	host: mysqlHostName,
	user: mysqlUserName,
	password: mysqlUserPassword,
	database: mysqlDatabase,
	ssl: {
		ca: fs.readFileSync( `${__dirname}/mysql/cleardb-ca.pem` ),
		key: fs.readFileSync( `${__dirname}/mysql/bf625d1cf3ab45-key.pem` ),
		cart: fs.readFileSync( `${__dirname}/mysql/bf625d1cf3ab45-cert.pem` )
	}
});

// Test Connection
mysqlPool.getConnection( ( error, connection ) => {
	if ( error ) throw error;
});

// Configuration

app.use( "/public", express.static( __dirname + "/public" )); // make express look in the public directory for assets (css/js/img)

// Routes sends our HTML file

app.get('/', ( request, response ) => {
	//console.log( 'getting /index.html' );
	response.sendFile( __dirname + '/index.html' ); 
});

// START Organism Database



app.get('/edit-organism-db', ( request, response ) => {
	//console.log( 'getting /edit-organism-db');
	response.sendFile( __dirname + '/edit-organism-db.html' ); 
});

app.post( '/get-organism-table', ( request, response ) => {
	mysqlPool.getConnection( ( error, connection ) => {
		connection.query(
			'SELECT * FROM organism_view',
			( error, result ) => {
			connection.release();
			if ( error ) { reponse.send( "" ); }
			// //console.log( result );
			response.send( result );
		});
	});
});

app.post( '/add-organism', bodyParser.json(), async ( request, response ) => {
	//response.sendFile( __dirname + '/index.html' ); 
	//console.log( 'request.body:' );
	//console.log( request.body );
	var set = request.body;
	let promise = new Promise( ( resolved, reject ) => {
		
	});
	console.log( 'a ' + set.typeName );
	set = await getIds( set );
	console.log( 'b ' + set.typeName );
	response.send('cool story bro');
});

async function getIds( set ) {
	console.log( 'set:' );
	console.log( set );
	let promise = new Promise( async ( resolve, reject ) => {
		set.typeName = await getIdByValue( 'organism_type', set.typeName );
		resolve( set );
	});
	set = await promise;
	//console.log( `set.typeName: ${set.typeName}` );
	return await set;
}	

async function getIdByValue( table, value ) {
	console.log( 'called getOrganismTypeId' );
	return await mysqlPool.getConnection( ( error, connection ) => {
		if ( error ) throw error;
		console.log( 'database connected' );
		connection.query( 
			'SELECT id FROM ?? WHERE name = ?',
			[ table, value ],
			( error, result ) => {
				if ( error ) throw error;
				connection.release();
				//console.log( result.length );
				if ( result.length === 0 ) { 
					return;
				}
				console.log( `id: ${result[ 0 ].id}` );
				return result[ 0 ].id;
			}
		);
	});
}

// File uploader
var storage = multer.diskStorage({
  destination: ( request, file, callback ) => {
    callback( null, './uploads' );
  },
  filename: ( request, file, callback ) => {
    callback( null, file.fieldname + '-' + Date.now() );
  }
});

var upload = multer({ storage : storage }).single( 'organismsFile' );

// upload organisms file to add to database
app.post('/add-organisms', ( request , response ) => {
	// save file
	new Promise( ( resolve, reject ) => {
		upload(
			request,
			response,
			( error ) => {
				if ( error ) {
					return response.send( 'Error uploading file.' );
				}
				////console.log( 'File uploaded' );
				////console.log( 'request.file:' );
				////console.log( request.file );
				resolve( request.file );
			}
		);
	})// read file
	.then( file => {
		response.send( { wasFileUploaded: true } );
		var path =__dirname + '/uploads/' + file.filename;
		//console.log( `file name path: ${ __dirname + file.filename}`);
		var options = { skipEmptyLines: true };
		var lineReader = new LineByLineReader( path, options );
		var iLine = 0;

		// error handler
		lineReader.on( 'error', ( error ) => {
			console.error( error );
		});

		// read line handler
		lineReader.on( 'line', ( line ) => {
			lineReader.pause();
			//console.log( line );

			// skip first line because it is column names
			//console.log( `iLine: ${iLine}`);
			iLine++;
			if ( iLine === 1 ) { // even though column names are on line 0, iterated already
				lineReader.resume();
			} else {
				new Promise(( resolve, reject ) => {
					mysqlPool.getConnection( ( error, connection ) => {
						if ( error ) { console.error( error ); reject( 'error' ); }
						//console.log( 'connected!' );
						resolve( connection );
					});
				})
				.then( connection => {
					var line = line.split( '\t' );
					var values = new Array( 9 );
					var query = 
						"INSERT INTO organism " +
						"( " +
						"VALUES ?";
					connection.query(
						query, 
						values, 
						( error, result ) => {
							if ( error ) { console.error( error ); }
							connection.release();
							//console.log( result );
							lineReader.resume();
					});
				});
			}
		});


		// end file handler
		lineReader.on( 'end', ( line ) => {
			//console.log( 'end file' );
		});

	});
});
// End filer uploader

app.post( '/delete-organism', jsonParser, ( request, response ) => {
	////console.log( request.body );
	var id = request.body.id;
	mysqlPool.getConnection( ( error, connection ) => {
		connection.query(
			'DELETE FROM organism WHERE id = ? ', 
			id, 
			( error, result ) => {
				connection.release();
				if ( error ) { response.send( { recordDeleted: false } ); }
				if ( result.length === 0 ) { 
							//console.log('reject');
							response.send( {recordDeleted: false } );
							reject();
							return;
						}
				////console.log( result );
				response.send({
					recordDeleted: true
				});
			}
		);
	});
});

// END Organism Database

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});*/



module.exports = app;