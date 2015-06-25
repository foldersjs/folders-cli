/*
 *
 * Vantage is heavy on dependencies but a nice way to present a REPL.
 * Suggest that npm install -g vantage is used if using the service.
 *
 */
var Vantage = require('vantage');
var server = new Vantage();


server.delimiter('folders~$').show();

