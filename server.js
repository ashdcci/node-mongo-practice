var express = require('express');
var path = require('path');
var cors            = require('cors');
var bodyParser = require('body-parser');
var morgan      = require('morgan');
var index = require('./routes/index');
var users = require('./routes/users');
var jobs = require('./routes/jobs');
var mailer = require('express-mailer')
var session = require('express-session');
var flash = require('express-flash')
config = require('config')

var port = config.get('ng-mongo.site.port');

var app = express();

// Body Parser MW
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(cors())
//View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(session({
  cookieName: 'session',
  secret: Math.random().toString(36),
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  // store:global.redis_store,
  proxy: true,
  saveUninitialized: false,
  resave: false
}));


//morge dev mode set
app.use(morgan('dev'));
app.use(flash());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'client')));
// set email service enabled
mail_service = require('./services/mailer')(app)



if(config.get('ng-mongo.site.env')=='dev'){
  // error handling for dev mode
  app.use(function(err, req, res, next) {

      console.log(err.status);

      res.status(err.status || 500);
      res.render('error', {
          message: err.message,
          error: err
      });
  });
}

app.use('/', index);
app.use('/api/users', users);
app.use('/api/jobs', jobs);

app.listen(port, function(){
  if(config.get('ng-mongo.site.env')=='dev'){
    console.log('Server started on port '+port);
  }
});
