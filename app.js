var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

/** --- html to node setup --- */

// client connection
var BinaryServer = require('binaryjs').BinaryServer;
var fs = require('fs');     // files
var wav = require('wav');   // sound files

var sqlite3 = require('sqlite3').verbose();     // test databases
var validator = require('email-validator');     // email validator
var session = require('express-session');       // sessions
var connect = require('connect');
//var SQLiteStore = require('connect-sqlite3')(session);

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var bcrypt = require('bcrypt');

var url = 'mongodb://localhost:27017/voice-app';    // connection url

MongoClient.connect(url, function(err, db){
    assert.equal(null, err);
    console.log("-- connected to mongo --");

    db.close();
});

/**
 * -- may 7 --
 * we dont need to transcribe anything for now
 *
 *
// speech to text setup
var SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var lyricist = require('lyricist')(process.env.GENIUS_KEY);

var speech_to_text = new SpeechToTextV1({
    username: process.env.SPEECHTOTEXT_USER,
    password: process.env.SPEECHTOTEXT_PASS
});

// parameters for watson speech to text api
var params = {
    model: 'en-US_BroadbandModel',
    content_type: 'audio/wav',
    continuous: true,
    'interim_results': true,
    'max_alternatives': 3,
    'word_confidence': false,
    timestamps: false,
    keywords: ['search'],
    'keywords_threshold': 0.5
};
 */

/** --- do NOT touch next 30 lines --- */

var index = require('./routes/index'); // login page
var users = require('./routes/users');
var dashboard = require('./routes/dashboard'); // dashboard
var newUser = require('./routes/newUser'); // user creation

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// store in database later or else we cant get to login page
app.use(session({
    secret: process.env.SPEECHTOTEXT_SESSIONDBSECRET,
    resave: false,
    saveUninitialized: true
}));

app.use('/', index);
app.use('/users', users);
app.use('/dashboard', dashboard);
app.use('/newUser', newUser);

// check for existing session - ignore type coercion warning
    // returns true if session does exist
app.get('/check-session', function(req, res){
    if(req.session.email == null){
        res.send(false);
    }else{
        res.send(true);
    }
});

app.get('/get-session', function(req, res){
    res.send(req.session.email);
});


/** --- email validation and create session --- */
app.get('/validate-email', function(req, res){

    // check if email is undefined
    // and run through validator node module
    if(req.query.email == undefined || validator.validate(req.query.email) == false){
        res.send('invalid email, try again');
    }else{
        req.session.email = req.query.email;
        res.send(true);
    }
});

// checks for space in string
function checkSpace(s){
    return /\s/g.test(s);
}

app.post('/validate-userInfo', function(req, res){

    var email = req.body.email;
    var password = req.body.password;
    var retypePassword = req.body.retypePassword;

    // check if email is undefined
    // and run through validator node module
    if(email == undefined || validator.validate(email) == false){
        res.send('invalid email, try again');
    }else if(password.length < 6){
        res.send('password must be longer than 6 characters');
    }else if(password == undefined || checkSpace(password) == true){

        // we dont need to check the size of the string
        // this is already done by htmls 'maxLength' attribute
        // do check for white spaces in the password
        res.send('please remove any spaces in your password');

    }else if(retypePassword != password){
        res.send('passwords do not match');
    }else{

        // todo: valid user info, store in database
        var user = {
            "email": email,
            "password": bcrypt.hashSync(password, bcrypt.genSaltSync(9))
        };
        //console.log("New user signed up");
        MongoClient.connect(url, function(err, db) {
            assert.equal(null, err);
            db.collection('user-data').insertOne(user, function(error, result) {
                assert.equal(null, error);
                console.log("User data inserted");
                db.close();
            });
        });

        // set up session upon success
        req.session.email = email;
        res.send(true);
    }
});



/**
 * -- may 6 --
 * commenting out this feature
 * will re enable when everything has been set up
 *
 *
 * --- translate text---
app.get('/translate', function(req, res){

    var path = 'users/' + req.session.email;

    var recognizeStream = speech_to_text.createRecognizeStream(params);
    //console.log(recognizeStream)
    fs.createReadStream(path + '/command.wav').pipe(recognizeStream);
    recognizeStream.pipe(fs.createWriteStream(path + '/transcription.txt'));

    recognizeStream.setEncoding('utf8');

    //recognizeStream.on('results', function(event) { onEvent('Results:', event); });
    recognizeStream.on('data', function(event){
        onEvent('Data:', event);
    });
    //recognizeStream.on('error', function(event) { onEvent('Error:', event); });
    //recognizeStream.on('close', function(event) { onEvent('Close:', event); });
    //recognizeStream.on('speaker_labels', function(event) { onEvent('Speaker_Labels:', event); });

});

// helper function to print json
function onEvent(name, event){
    var message = JSON.stringify(event, null, 2);
    lyricist.song({search: message}, function(err, song){
        console.log("%s", song.lyrics);
    });
    //console.log(name, JSON.stringify(event, null, 2));
}
*/

/** --- do NOT touch the code below --- */

// catch 404 and forward to error handler
app.use(function(req, res, next){
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if(app.get('env') === 'development'){
    app.use(function(err, req, res, next){
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next){
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


/** --- binary server --- */
binaryServer = BinaryServer({
    port: 9001
});

// store .wav file into '/users/<USER_EMAIL>/voiceCommand.wav'
binaryServer.on('connection', function(client){
    console.log('-- new connection (page loaded) --');

    client.on('stream', function(stream, meta){
        console.log('-- new stream (start recording) --');

        // meta.sessionEmail has the session
        var userDirectory = "./users/" + meta.sessionEmail;
        if(!fs.existsSync(userDirectory)){
            fs.mkdirSync(userDirectory);
        }

        var outFile = userDirectory + "/command.wav";

        var fileWriter = new wav.FileWriter(outFile, {
            channels: 1,
            sampleRate: 48000,
            bitDepth: 16
        });

        stream.pipe(fileWriter);
        stream.on('end', function(){

            fileWriter.end();
            console.log('-- wrote to file ' + outFile + ' --');
        });
    });
});


module.exports = app;









