/*jshint esversion: 6*/
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
	database: mysqlDatabase
});
	
// Test connection
mysqlConnection.connect( error => {
	if ( error ) throw error;

	//console.log( `Connected to ${mysqlHostName} MySQL database as user ${mysqlUserName}.` );
	//mysqlConnection.end();
});*/

var mysqlPool = mysql.createPool({
	connectionLimit: 100,
	host: mysqlHostName,
	user: mysqlUserName,
	password: mysqlUserPassword,
	database: mysqlDatabase
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

app.post( '/add-organism', bodyParser.json(), ( request, response ) => {
	//response.sendFile( __dirname + '/index.html' ); 
	//console.log( 'request.body:' );
	//console.log( request.body );
	var set = request.body;
	getIds( set )
	.then( resolved => {
		response.send({ 
			id: resolved.insertId,
			record: result,
			recordAdded: true
		});
	});
});

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

function getIds( set ) {
	//console.log( 'set:' );
	//console.log( set );
	return new Promise(( resolve, reject ) => {
		getOrganismTypeId( set, set => {
			resolve( set );
		});
	})
	.then( set => {
		return new Promise(( resolve, reject ) => {
			getOrgnismFamilyId( set ).then( set => { resolve( set ); } );
		});
	})
	.then( set => {
		getOrganismSubfamilyId( set ).then( set => { resolve( set ); } );
	})
	.then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				if ( error ) throw error;
				connection.query(
					'SELECT id FROM organism_genus WHERE name = ?',
					body.genusName,
					( error, result ) => {
						if ( error ) throw error;
						if ( result.length === 0 ) { 
							//console.log('reject');
							reject();
							return;
						}
						set.genus_id = result[ 0 ].id;
						//console.log( `set.genus_id: ${set.genus_id}`);
						resolve();
					}
				);
			});
		});
	})
	.then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				if ( error ) throw error;
				connection.query(
					'SELECT id FROM gram_stain_group WHERE name = ?',
					body.gramStainGroupName,
					( error, result ) => {
						if ( error ) throw error;
						connection.release();
						if ( result.length === 0 ) { 
							//console.log('reject');
							reject();
							return;
						}
						set.gram_stain_group_id = result[ 0 ].id;
						//console.log( `set.gram_stain_group_id: ${set.gram_stain_group}`);
						resolve();
					}
				);
			});
		});
	})
	.then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				if ( error ) throw error;
				connection.query(
					'SELECT id FROM genome_type WHERE name = ?',
					body.genomeTypeName,
					( error, result ) => {
						if ( error ) throw error;
						connection.release();
						if ( result.length === 0 ) { 
							//console.log('reject');
							reject();
							return;
						}
						set.genome_type_id = result[ 0 ].id;
						//console.log( `set.genome_type_id: ${set.genome_type_id}`);
						resolve();
					}
				);
			});
		});
	})
	.then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				if ( error ) throw error;
				connection.query(
					'INSERT INTO organism SET ?', 
					set, 
					( error, result ) => {
						if ( error ) throw error;
						connection.release();
						if ( result.length === 0 ) { 
							//console.log('reject');
							reject();
							return;
						}
						//console.log( 'set:' );
						//console.log( set );
						//console.log( 'result:' );
						//console.log( result );
						resolve( result );
					}
				);
			});
		});
	})
	.then( resolved => {
		mysqlPool.getConnection( ( error, connection ) => {
			if ( error ) throw error;
			connection.query(
				'SELECT * FROM organism_view WHERE id = ?', 
				resolved.insertId, 
				( error, result ) => {
					if ( error ) throw error;
					connection.release();
					if ( result.length === 0 ) { 
						//console.log('reject');
						reject();
						return;
					}
					//console.log( 'set:' );
					//console.log( set );
					//console.log( 'result:' );
					//console.log( result );
					resolve();
				}
			);
		});
	});
}

function getOrganismTypeId( set, callback ) {
	console.log('woot');
	console.log( 'called getOrganismTypeId' );
	//console.log( `name: ${set.typeName}` );
	var value = ( set.typeName === '' ) ? 'UNKNOWN' : set.typeName;
	//console.log( `value: ${value}` );
	mysqlPool.getConnection( ( error, connection ) => {
		if ( error ) throw error;
			connection.query( 
			'SELECT id FROM organism_type WHERE name = ?',
			value,
			( error, result ) => {
				if ( error ) throw error;
				connection.release();
				//console.log( result.length );
				if ( result.length === 0 ) { 
					return;
				}
				set.typeName = result[ 0 ].id;
				//console.log( 'set:' );
				//console.log( set );
				console.log( 'resolved getOrganismTypeId' );
				callback( set );
			}
		);
	});
}

function getOrgnismFamilyId( set ) {
	console.log( 'called getOrgnismFamilyId' );
	//console.log( 'set:' );
	//console.log( set );
	var value = ( set.familyName === '' ) ? 'UNKNOWN' : set.familyName;
	return new Promise( ( resolve, reject ) => {
		mysqlPool.getConnection( ( error, connection ) => {
			if ( error ) throw error;
				connection.query(
				'SELECT id FROM organism_family WHERE name = ?',
				value,
				( error, result ) => {
					if ( error ) throw error;
					connection.release();
					if ( result.length === 0 ) {
						reject( 'organism family name not found in database' );
						return;
					}
					set.familyName = result[ 0 ].id;
					console.log( 'resolved getOrgnismFamilyId' );
					resolve( set );
				}
			);
		});
	});
}

function getOrganismSubfamilyId( set ) {
	var value = ( set.subfamilyName === '' ) ? 'UNKNOWN' : set.subfamilyName;
	return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				if ( error ) throw error;
				connection.query(
					'SELECT id FROM organism_subfamily WHERE name = ?',
					value,
					( error, result ) => {
						if ( error ) throw error;
						connection.release();
						if ( result.length === 0 ) { 
							//console.log('reject');
							reject( 'organism subfamily name not found in database' );
							return;
						}
						set.subfamilyName = result[ 0 ].id;
						//console.log( `set.subfamily_id: ${set.subfamily_id}`);
						console.log( set );
						resolve( set );
					}
				);
			});
		});
}

module.exports = app;