var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var morgan      = require('morgan');
var index = require('./routes/index');
var tasks = require('./routes/tasks');
var posts = require('./routes/posts');

var port = 3005;

var app = express();

//View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

//morge dev mode set
app.use(morgan('dev'));

// Set Static Folder
app.use(express.static(path.join(__dirname, 'client')));

// Body Parser MW
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// error handling for dev mode
app.use(function(err, req, res, next) {
  console.log(err.status);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});

app.use('/', index);
app.use('/api/tasks', tasks);
app.use('/api/posts', posts);

app.listen(port, function(){
    console.log('Server started on port '+port);
});
