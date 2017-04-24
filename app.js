var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var fs = require('fs');
var lyricist = require('lyricist')(process.env.GENIUS_KEY);

var speech_to_text = new SpeechToTextV1 ({
  username: process.env.SPEECHTOTEXT_USER,
  password: process.env.SPEECHTOTEXT_PASS
});

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

/** --- html to node setup --- */

// client connection
var BinaryServer = require('binaryjs').BinaryServer;
var fs = require('fs');     // files
var wav = require('wav');   // sound files

var sqlite3 = require('sqlite3').verbose();     // test databases
var validator = require('email-validator');     // email validator
var session = require('express-session');       // sessions
var connect = require('connect');
var SQLiteStore = require('connect-sqlite3')(session);

// global variable for audio file
// used in binary server to store user audio from UI
// todo: send to speech to text api to transcribe
/** apr 3 - removed global var, find voice file in /users */
//var outFile = 'demo.wav';

var sess;



// login page
var index = require('./routes/index');
var users = require('./routes/users');

// dashboard page
var dashboard = require('./routes/dashboard');

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

// todo: replace secret (and hide it), store in database
// store in database later or else we cant get to login page
app.use(session({
    secret: process.env.SPEECHTOTEXT_SESSIONDBSECRET,
    resave: false,
    saveUninitialized: true
}));


app.use('/', index);
app.use('/users', users);
app.use('/dashboard', dashboard);


// check for existing session
// works - March 29
app.get('/check-session', function(req, res){
    sess = req.session;
    if(sess.email == null){
        res.send('sessionless');
    }else{
        res.end('exists');
    }
});

app.get('/get-session', function(req, res){
    sess = req.session;
    res.send(sess.email);
});



/** --- email validation and create session --- */
app.get('/validate-email', function(req, res){
    sess = req.session;

    // check if email is undefined
    // and run through validator node module
    if(req.query.email == undefined || validator.validate(req.query.email) == false){
        res.send('<p>invalid email, try again</p>');
    } else {
        sess.email = req.query.email;
        res.end('valid');
    }
});

/** --- translate text--- */
app.get('/translate', function(req, res) {

    var path = 'users/' + req.session.email;

    var recognizeStream = speech_to_text.createRecognizeStream(params);
    //console.log(recognizeStream)
    fs.createReadStream(path + '/command.wav').pipe(recognizeStream);
    recognizeStream.pipe(fs.createWriteStream(path + '/transcription.txt'));

    recognizeStream.setEncoding('utf8');

    //recognizeStream.on('results', function(event) { onEvent('Results:', event); });
    recognizeStream.on('data', function(event) { onEvent('Data:', event); });
    //recognizeStream.on('error', function(event) { onEvent('Error:', event); });
    //recognizeStream.on('close', function(event) { onEvent('Close:', event); });
    //recognizeStream.on('speaker_labels', function(event) { onEvent('Speaker_Labels:', event); });


});

/** --- Helper function to print json **/
function onEvent(name, event) {
  console.log(name, JSON.stringify(event, null, 2));
};


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

// todo: store .wav file into '/users/<USER_EMAIL>/voiceCommand.wav'

binaryServer.on('connection', function(client){
    console.log('new connection (page loaded)');

    client.on('stream', function(stream, meta){
        console.log('new stream (start recording)');

        // meta.sessionEmail has the session
        //console.log('meta: ' + meta.sessionEmail);

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

            // now we have a demo.wav file ready to transcribe
            fileWriter.end();
            console.log('wrote to file ' + outFile);
        });
    });
});



module.exports = app;









