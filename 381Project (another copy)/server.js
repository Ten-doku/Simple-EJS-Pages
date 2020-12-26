const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const express = require('express');
const assert = require('assert');
const fs = require('fs');
const formidable = require('express-formidable');
const session = require('cookie-session');
//So Many  We Need


const mongourl = '';
const dbName = '381project'; //remember to change it


const app = express();
app.use(formidable());

const SECRETKEY = '';

app.use(session({
	name: 'LoggedIn',
	keys: [SECRETKEY],
	maxAge: 24 * 60 * 60 * 1000
}));


app.set('view engine','ejs');
app.use(express.static('public')); //file stores the css or bootstrap kinda stuff




//Rating updateDocument 
const updateDocument = (collection, criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection(collection).updateOne(criteria,
            {
                $push: { 'ratings': updateDoc }
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}


//findDocument Copied from tutorial
const findDocument = (db, criteria, collection, callback) => {
    let cursor = db.collection(collection).find(criteria); //Collection Name Here
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}
//insertDocument Copied from tutorial
const insertDocument = (db, doc, collection,callback) => {
    db.collection(collection).
    insertOne(doc, (err, results) => {
        assert.equal(err,null);
        console.log(`Inserted document(s): ${results.insertedCount}`);
        callback();
    });
}


//Connect to Database and compare the password
const handle_Login = (req, res) => {
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        	assert.equal(null, err);
        	console.log("Connected successfully to server");
        	const db = client.db(dbName);
		var criteria = {};
		criteria['userid']= req.fields.id;
		var collection ='user';
 		findDocument(db, criteria,collection, (docs) => {
            		client.close();
            		console.log("Closed DB connection");
			if(docs.length == 0){
				res.redirect('/login');//login failed , cannot find id
			}else {	
				if(docs[0].password == req.fields.password){
					if (req.session.LoggedIn == null) { //Create Cookie-Session 
						req.session.LoggedIn = [];
						req.session.LoggedIn.push(req.fields.id);
						res.redirect('/read');
					}else{
						req.session.LoggedIn = null; // delete old Cookie-Session
						req.session.LoggedIn = [];
						req.session.LoggedIn.push(req.fields.id);
						res.redirect('/read');
					}		
				}
				
				else			
				res.redirect('/login');//login failed , wrong password
			}
		});
           
        });

}
//check if the userid is used
const handle_CreateAccount = (req, res) => {
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        	assert.equal(null, err);
        	console.log("Connected successfully to server");
        	const db = client.db(dbName);
		var criteria = {};
		criteria['userid']= req.fields.id;	
		var collection ='user';
 		findDocument(db, criteria, collection,(docs) => {
            		
			if(docs.length == 0){
				criteria['password']= req.fields.password;
				insertDocument(db, criteria, collection, ()=>{
				client.close();
            			console.log("Closed DB connection");
				res.status(200).end('Account Created!');
				});
			}else {	
				res.status(200).end('This userId has been used!');
				
			}		
		});
           
        });

}
//handle read also with query
const handle_Read = (req,res) =>{
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        	assert.equal(null, err);
        	console.log("Connected successfully to server");
        	const db = client.db(dbName);
		var criteria = req.query;
		var collection ='restaurant';
		findDocument(db, criteria, collection,(docs) => {
			client.close();
            		console.log("Closed DB connection");
			//combine into one JsonObject
			var returnVals= JSON.stringify({restaurants: docs, userid: req.session.LoggedIn[0], criteria: criteria});
			res.render('Restaurant',JSON.parse(returnVals));
		});
		
	});
		
}

const handle_Create = (req, res) => {
	var collection ='restaurant';
        var insertDoc = {};
	var address = {};
	var ratings = [];
	insertDoc['name']= req.fields.name;
	insertDoc['borough'] = req.fields.borough;
	insertDoc['cuisine']= req.fields.cuisine;
	address['street']= req.fields.street;
	address['building']= req.fields.building;
	address['zipcode']= req.fields.zipcode;
	address['lon']= req.fields.lon;
	address['lat']= req.fields.lat;
	insertDoc['address']= address;
	insertDoc['ratings'] = ratings;	
	if (req.files.sampleFile.size>0) { //check file existence
           	fs.readFile(req.files.sampleFile.path, (err,data) => {
                	assert.equal(err,null);
                	insertDoc['photo'] = new Buffer.from(data).toString('base64');
		});
		insertDoc['photomimetype'] = req.files.sampleFile.type;
	}	
	insertDoc['owner'] = req.session.LoggedIn[0];
	
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        	assert.equal(null, err);
        	console.log("Connected successfully to server");
        	const db = client.db(dbName);
		insertDocument(db, insertDoc, collection,() => {
			client.close();
            		console.log("Closed DB connection");
			res.status(200).redirect('/read');
		});
		
	});
};
	

const handle_Display = (req, res) =>{
	var collection ='restaurant';
	var criteria = req.query;
	let DOCID = {};
	DOCID['_id'] = ObjectID(criteria._id);
	
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        	assert.equal(null, err);
        	console.log("Connected successfully to server");
        	const db = client.db(dbName);
		findDocument(db, DOCID, collection,(docs) => {
			client.close();
            		console.log("Closed DB connection");
			res.render('Display',{restaurants: docs});
		});
		
	});
}

const show_Change = (req, res) =>{
	var collection ='restaurant';
	var criteria = req.query;
	let DOCID = {};
	DOCID['_id'] = ObjectID(criteria._id);
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        	assert.equal(null, err);
        	console.log("Connected successfully to server");
        	const db = client.db(dbName);
		findDocument(db, DOCID, collection,(docs) => {
			client.close();
            		console.log("Closed DB connection");
			if(req.session.LoggedIn[0] == docs[0].owner){
				res.render('Modify',{restaurants: docs});
			}else{
				res.status(200).end('You can not edit if you are not the owner');
			}
		});
		
	});
}

const handle_Change = (req, res) =>{
	var collection ='restaurant';
	let DOCID = {};
	DOCID['_id'] = ObjectID(req.fields._id);
	var editDoc = {}
	var address = {};
	editDoc['name']= req.fields.name;
	editDoc['borough'] = req.fields.borough;
	editDoc['cuisine']= req.fields.cuisine;
	address['street']= req.fields.street;
	address['building']= req.fields.building;
	address['zipcode']= req.fields.zipcode;
	address['lon']= req.fields.lon;
	address['lat']= req.fields.lat;
	editDoc['address']= address;
	if (req.files.sampleFile.size>0) { //check file existence
           	fs.readFile(req.files.sampleFile.path, (err,data) => {
                	assert.equal(err,null);
                	editDoc['photo'] = new Buffer.from(data).toString('base64');
		});
		editDoc['photomimetype'] = req.files.sampleFile.type;
	
	}
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        	assert.equal(null, err);
        	console.log("Connected successfully to server");
        	const db = client.db(dbName);
		db.collection(collection).updateOne(DOCID,
            			{
                			$set : editDoc
            			},(err, results) => {
				client.close();
                		assert.equal(err, null);
				res.status(200).redirect('/display?_id='+req.fields._id);;
	    	});
	});
}
//LFY Handle_Rate
const handle_Rate = (req, res) => {
    const client = new MongoClient(mongourl);

    if (req.fields.score == '') 
        res.status(500).end(`${req.path} invalid query parameters!`);

    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        var criteria = {};
        criteria['_id'] = ObjectID(req.fields._id);
        var collection = 'restaurant';
        var isRated = false;
        
        findDocument(db, criteria, collection, (docs) => {
            client.close();
            console.log("Closed DB connection");
            if (docs[0]) { //check if restaurant existed
                console.log('rating length:'+docs[0].ratings.length)
                console.log('session:'+req.session.LoggedIn[0]);
                console.log('score:'+ req.fields.score);
                var updateDoc = {};
                updateDoc['score'] = req.fields.score;
                updateDoc['userid'] = req.session.LoggedIn[0];
                if (docs[0].ratings.length == 0) {
                    updateDocument(collection, criteria, updateDoc, (results) => {
                        res.end(`Empty!! Updated ${results.result.nModified} document(s)`);
                    });
                } else {
                    docs[0].ratings.forEach((rating) => {
                        console.log('ratinguserid:'+rating.userid)
                        if (rating.userid == req.session.LoggedIn[0]) {
                            isRated = true;
                        }
                    })
                    if (isRated) {
                        res.status(200).end('ERROR: You have rated this restaurant');
                    } else {
                        updateDocument(collection, criteria, updateDoc, (results) => {
                            res.end(`success!! Updated ${results.result.nModified} document(s)`)
                        });
                    }
                }

            } else { // restaurant not exist
                res.status(502).end('Bad Gateway: Registered endpoint failed to handle the request.');
            } 
        });
    });
}

//LFY Handle_Delete
const handle_Delete = (req, res) => {
    const client = new MongoClient(mongourl);

    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        var criteria = {};
        criteria['_id'] = ObjectID(req.query._id);
        var collection = 'restaurant';
        
        findDocument(db, criteria, collection, (docs) => {
            client.close();
            console.log("Closed DB connection");
            if (docs[0]) { //check if restaurant existed
                console.log('owner'+docs[0].owner)
                console.log('session:'+req.session.LoggedIn[0]);

                if (docs[0].owner == req.session.LoggedIn[0]) {
                    console.log('OK')
                    deleteDocument(collection, criteria, (results) => {
                        res.end(`Deleted documents having criteria ${JSON.stringify(criteria)}: ${results.deletedCount}`);
                    });
                } else { // not the owner
                    res.status(200).end('ERROR: You are not authorized to delete!!!');
                }
            } else {
                res.status(502).end('Bad Gateway: Registered endpoint failed to handle the request.');
            }
        });
    });
}

// LFY deleteDocument
const deleteDocument = (collection, criteria, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection(collection).deleteMany(criteria, (err,results) => {
            client.close();
            assert.equal(err,null);
            console.log('delete was successful');
            callback(results);
        })
    })
}

const handle_Search = (req, res) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        var criteria = {};
        criteria[req.query.type] = req.query.value;
	console.log(criteria);
        var collection = 'restaurant';
        findDocument(db, criteria, collection, (docs) => {
            client.close();
            console.log("Closed DB connection");
            //combine into one JsonObject
            
            var returnVals = JSON.stringify({ restaurants: docs, userid: req.session.LoggedIn[0], criteria: criteria });
            res.render('Restaurant', JSON.parse(returnVals));
            
        });
    });
}


app.get('/delete', function (req, res) {
    if (req.session.LoggedIn == null)
        res.redirect('/login');
    else {
        handle_Delete(req, res);
    }
});




		
 		
	





app.get('/', function(req,res) {
	if (req.session.LoggedIn == null)
	res.redirect('/login');
	else 
	res.redirect('/read');
});

app.get('/login', function(req,res){
	res.status(200).render('Login');
});

app.post('/processlogin', function(req,res){
	handle_Login(req,res);	
});

app.get('/createAC',function(req,res){
	res.status(200).render('CreateAccount');
});

app.post('/processCreateAccount',function(req,res){
	handle_CreateAccount(req,res);
});

app.get('/read' ,function(req,res){
	if (req.session.LoggedIn == null)
	res.redirect('/login');
	else handle_Read(req,res,req.query);
});

app.get('/new' ,function(req,res){
	if (req.session.LoggedIn == null)
	res.redirect('/login');
	else res.status(200).render('CreateNewRestaurant');
});

app.post('/create', function(req,res){
	handle_Create(req,res);
});

app.get('/display',function(req,res){
	handle_Display(req,res);
});

app.get('/change',function(req,res){
	show_Change(req,res);
});

app.post('/change',function(req,res){
	handle_Change(req,res);
});
app.get('/rate', (req, res) => {
    if (req.session.LoggedIn == null)
        res.redirect('/login');
    else {
        console.log(req.query._id);
        res.status(200).render('Rate', {restaurantid: req.query._id});
    }//, {restaurantid: req.query._id} <%=restaurantid%>
});


//LFY app.post
app.post('/rate', (req, res) => {
    handle_Rate(req, res);
})





app.get('/api/restaurant/name/:name', (req,res) => {
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        var collection = 'restaurant';
        client.connect((err) => {																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																										
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, collection,(docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing name"});
    }
})

app.get('/api/restaurant/borough/:borough', (req,res) => {
    if (req.params.borough) {
        let criteria = {};
        criteria['borough'] = req.params.borough;
        const client = new MongoClient(mongourl);
        var collection = 'restaurant';
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, collection, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing borough"});
    }
})

app.get('/api/restaurant/cuisine/:cuisine', (req,res) => {
    if (req.params.cuisine) {
        let criteria = {};
        criteria['cuisine'] = req.params.cuisine;
        const client = new MongoClient(mongourl);
        var collection = 'restaurant';
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, collection,(docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing cuisine"});
    }
})
app.get('/gmap',function(req,res){
	res.render("leaflet.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		zoom:req.query.zoom ? req.query.zoom : 15
	});
	res.end();
	

});
app.get('/search', function (req, res) {
    if (req.session.LoggedIn == null)
        res.redirect('/login');
    else handle_Search(req, res);
});


app.listen(process.env.PORT || 8099); 
