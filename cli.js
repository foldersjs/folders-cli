/*
 cli.js proposed flags

* Local webserver options
 --listen=8090
 --route=window.io
 --proxy=false

* Provider options
 --use-stub (default)
 --use-local=. 

* Examples:

* Listen on port 8090 for local requests, send stub responses.
node cli.js --listen=8090 --use-stub

* Connect to window.io, serving responses.
node cli.js --route=window.io

* Listen on port 8090 forwarding requests to window.io as appropriate
node cli.js --listen=8090 --route=window.io
*/

var cli = require('minimist')
  , forwardingProxy = require('folders-http/forwardingProxy');
  , standaloneProxy = require('folders-http/standaloneProxy')

  , Fio 			= require('folders')
  , server	= require('folders-http/server.js')

var cliHandler = function(){
	var argv = cli(process.argv.slice(2));
	
	switch(true){
		
		case (argv['_'].indexOf('forward') > -1):
			forwardFriendly(argv)
			break;
		case (argv['_'].indexOf('standalone') > -1):
			standaloneFriendly(argv)
			break;
		case (argv['_'].indexOf('server') > -1): 
			serverFriendly(argv)
			break;
		default:
			// nothing we can do.  Just hope for the best.
			return
	}
	
};



var forwardFriendly = function(argv){
	
	if ('provider' in argv){
		var options = {}
		var t = argv['provider'].split(':');
		options.provider = t[0];
		options.shareId  = argv['shareid'] = t[1];
		var f = new forwardingProxy(argv);
		var p = new provider(options,f);
		p.fioHandler();
		
	}else{
		var forward = new forwardingProxy(argv)
		forward.startProxy()
	}
};

var standaloneFriendly = function(argv){
    
	if ('provider' in argv){
		var options = {}
		var t = argv['provider'].split(':');
		options.provider = t[0];
		options.shareId  = t[1];
		argv.mode = 1 ;
		var s = new standaloneProxy(argv);
		// FIXME: Provider pattern is still a bit broken.
		var p = Fio.provider()
		p = new p(options,s);
		p.fioHandler();
	} else {
		var fio = new Fio();
		var standalone = new standaloneProxy(argv);
		var routeHandler = new Fio.router(fio);
		var backend = new (Fio.stub());

		standalone.startProxy(routeHandler, backend);	
	}	

};

var serverFriendly = function(argv){
	
	var server_t = new server(argv)
	
};


cliHandler()
