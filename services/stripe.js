var config = require('config')
var stripe = require("stripe")(config.get('ng-mongo.stripe.test'));

module.exports = stripe
