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

/*console.log( fs.readFileSync( `${__dirname}/mysql/cleardb/cleardb-ca.pem` ) );
console.log( fs.readFileSync( `${__dirname}/mysql/cleardb/bf625d1cf3ab45-key.pem` ) );
console.log( fs.readFileSync( `${__dirname}/mysql/cleardb/bf625d1cf3ab45-cert.pem` ) );*/

var mysqlPool = mysql.createPool({
	connectionLimit: 100,
	host: mysqlHostName,
	user: mysqlUserName,
	password: mysqlUserPassword,
	database: mysqlDatabase/*,
	ssl: { // why am I given these ssl keys if I don't need them to connect?
		ca: fs.readFileSync( `${__dirname}/mysql/cleardb/cleardb-ca.pem` ),
		key: fs.readFileSync( `${__dirname}/mysql/cleardb/bf625d1cf3ab45-key.pem` ),
		cart: fs.readFileSync( `${__dirname}/mysql/cleardb/bf625d1cf3ab45-cert.pem` )
	}*/
});

// Test Connection
console.log( 'testing mysql connection' );
mysqlPool.getConnection( ( error, connection ) => {
	if ( error ) throw error;
	console.log( 'mysql test connection successful' );
	connection.release();
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

async function addOrganism( record ) {
	record.typeName = await getIdByValue( 'organism_type', record.typeName );
	record.familyName = await getIdByValue( 'organism_family', record.familyName );
	record.subfamilyName = await getIdByValue( 'organism_subfamily', record.subfamilyName );
	record.genusName = await getIdByValue( 'organism_genus', record.genusName );
	record.gramStainGroupName = await getIdByValue( 'gram_stain_group', record.gramStainGroupName );
	record.genomeTypeName = await getIdByValue( 'genome_type', record.genomeTypeName );
	var columns = [
		'species_name',
		'common_name',
		'type_id',
		'family_id',
		'subfamily_id',
		'genus_id',
		'genome_type_id',
		'gram_stain_group_id',
		'genome_length_bp'
	];
	var values = await [
		record.speciesName,
		record.commonName,
		record.typeName,
		record.familyName,
		record.subfamilyName,
		record.genusName,
		record.genomeTypeName,
		record.gramStainGroupName,
		Number( record.genomeLength )
	];
	console.log( values );
	return new Promise( ( resolve, reject ) => {
		mysqlPool.getConnection( ( error, connection ) => {
			connection.query(
				'INSERT INTO organism ( ?? ) VALUES ( ? )',
				[ columns, values ],
				( error, result ) => {
					if ( error ) {
						console.error( error.code );
						console.error( error.sqlMessage );
						console.error( error.sql );
						resolve({ recordAdded: false });
					}
					console.log( result );
					connection.release();
					resolve({ 
						recordAdded: true,
						id: result.insertId
					});
				}
			);
		});
<<<<<<< HEAD
	}).then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
					connection.query(
					'SELECT id FROM organism_family WHERE name = ?',
					request.body.familyName,
					( error, result ) => {
						connection.release();
						if ( error ) { response.send( {recordAdded: false } ); }
						if ( result.length === 0 ) { 
							console.log('reject');
							response.send( {recordAdded: false } );
							reject();
							return
						}
						set.family_id = result[ 0 ].id;
						console.log( `set.family_id: ${set.family_id}`);
						resolve();
					}
				);
			});
		});
	}).then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				connection.query(
					'SELECT id FROM organism_subfamily WHERE name = ?',
					request.body.subfamilyName,
					( error, result ) => {
						connection.release();
						if ( error ) { response.send( {recordAdded: false } ); }
						if ( result.length === 0 ) { 
							console.log('reject');
							response.send( {recordAdded: false } );
							reject();
							return
						}
						set.subfamily_id = result[ 0 ].id;
						console.log( `set.subfamily_id: ${set.subfamily_id}`);
						resolve();
					}
				);
			});
		});
	}).then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				connection.query(
					'SELECT id FROM organism_genus WHERE name = ?',
					request.body.genusName,
					( error, result ) => {
						connection.release();
						if ( error ) { response.send( {recordAdded: false } ); }
						if ( result.length === 0 ) { 
							console.log('reject');
							response.send( {recordAdded: false } );
							reject();
							return
						}
						set.genus_id = result[ 0 ].id;
						console.log( `set.genus_id: ${set.genus_id}`);
						resolve();
					}
				);
			});
		});
	}).then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				connection.query(
					'SELECT id FROM gram_stain_group WHERE name = ?',
					request.body.gramStainGroupName,
					( error, result ) => {
						connection.release();
						if ( error ) { response.send( {recordAdded: false } ); }
						if ( result.length === 0 ) { 
							console.log('reject');
							response.send( {recordAdded: false } );
							reject();
							return
						}
						set.gram_stain_group_id = result[ 0 ].id;
						console.log( `set.gram_stain_group_id: ${set.gram_stain_group}`);
						resolve();
					}
				);
			});
		});
	}).then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				connection.query(
					'SELECT id FROM genome_type WHERE name = ?',
					request.body.genomeTypeName,
					( error, result ) => {
						connection.release();
						if ( error ) { response.send( {recordAdded: false } ); }
						if ( result.length === 0 ) { 
							console.log('reject');
							response.send( {recordAdded: false } );
							reject();
							return;
						}
						set.genome_type_id = result[ 0 ].id;
						console.log( `set.genome_type_id: ${set.genome_type_id}`);
						resolve();
					}
				);
			});
		});
	}).then( () => {
		return new Promise( ( resolve, reject ) => {
			mysqlPool.getConnection( ( error, connection ) => {
				connection.query(
					'INSERT INTO organism SET ?', 
					set, 
					( error, result ) => {
						connection.release();
						if ( error ) { response.send( {recordAdded: false } ); }
						if ( result.length === 0 ) { 
							console.log('reject');
							response.send( {recordAdded: false } );
							reject();
							return
						}
						console.log( 'set:' );
						console.log( set );
						console.log( 'result:' );
						console.log( result );
						resolve( result );
					}
				);
			});
		});
	}).then( resolved => {
=======
	});
}

app.post( '/add-organism', bodyParser.json(), async ( request, response ) => {
	console.log( request.body );
	var record = request.body;
	var result = await addOrganism( record );
	response.send( result );
});

async function getIdByValue( table, value ) {
	console.log( 'called getOrganismTypeId' );
	return new Promise( ( resolve, reject ) => {
>>>>>>> 4c6cf77ca7206966edc5063927e94f97b9ecff3b
		mysqlPool.getConnection( ( error, connection ) => {
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
						resolve();
					}
					console.log( `id: ${result[ 0 ].id}` );
					resolve( result[ 0 ].id );
				}
			);
		});
	});
}

// File uploader
var storage = multer.diskStorage({
  destination: ( request, file, callback ) => {
    callback( null, './uploads' );
  },
  filename: ( request, file, callback ) => {
    callback( null, file.fieldname + '-' + Date.now() + '.data' );
  }
});

var upload = multer({ storage : storage }).single( 'organismsFile' );

// upload organisms file to add to database
/*app.post('/add-organisms', async ( request , response ) => {
	// save file
	var file = await new Promise( ( resolve, reject ) => {
		upload( request, response, 
			( error ) => {
				if ( error ) {
					response.send( 'Error uploading file.' );
				}
				console.log( request.file );
				response.send( { wasFileUploaded: true } );
				resolve( request.file );
			}
		);
	})

	var path = await __dirname + '/uploads/' + file.filename;
	var options = { skipEmptyLines: true };

	await readLines( path );

	function readLines( path ) {
		var lineReader = new LineByLineReader( path, options );
		var iLine = 0;

		lineReader.on( 'error', ( error ) => {
			console.log( 'line reader error:' );
			console.error( error );
		});

		lineReader.on( 'line', ( line ) => {
			iLine++;
			// skip first line because it's column headers
			if ( iLine === 1 ) return;
			var values = line.split( '\t' );
			//console.log( values );
			var record = {};
		});

		lineReader.on( 'end', () => {
			console.log( 'line reader end' );
		});

	}

});*/
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