
var config = require('config'),
    mailer = require('express-mailer');

module.exports = function(app){
  mailer.extend(app, {
    from: 'me@example.com',
    host: 'email-smtp.us-west-2.amazonaws.com', // hostname
    secureConnection: true, // use SSL
    port: 587, // port for secure SMTP
    transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
    auth: {
      user: 'AKIAJRULFZWZLVADGEQA',
      pass: 'AjTb6ZrCOPJS/hTd9PKbWur4ZzQfTvDcSVNZHulYBKsQ'
    }
  });
}
