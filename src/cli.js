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


var cli = require('minimist');
var  FoldersHttp = require('folders-http');	
var  forwardingProxy = require('folders-http/src/forwardingProxy');
var  standaloneProxy = require('folders-http/src/standaloneProxy');
var Server = require('folders-http/src/standaloneServer');
var  Fio = require('folders');
//var server	= require('folders-http/server.js');

var cliHandler = function(){
	var argv = cli(process.argv.slice(2));
	var module = argv['_'][0];
	
	switch(true){
		

		case (module == 'forward'):
			forwardFriendly(argv)
			break;

		case (module == 'standalone'):
			standaloneFriendly(argv);
			break;

		case (module == 'server'): 
			serverFriendly(argv);
			break;
		case (module == 'folders-http'):
			httpFriendly(argv);
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
		f.startProxy();
		// no need to use provider here 
		// provider can be used in standalone server 
		//var p = new provider(options,f);
		//p.fioHandler();
		
	}else{
		var forward = new forwardingProxy(argv)
		forward.startProxy()
	}
};

var standaloneFriendly = function(argv){
    
	argv = argv || {};
	if ('provider' in argv){
		console.log('standaloneFriendly provider:', provider);
		var options = {}
		var t = argv['provider'].split(':');
		options.provider = t[0];
		options.shareId  = t[1];
		argv.mode = 1 ;
		var s = new standaloneProxy(argv);
		// FIXME: Provider pattern is still a bit broken.
		var p = Fio.provider('local')
		p = new p(options,s);
		p.fioHandler();
	} else {
		console.log('standaloneFriendly stub');
		var fio = new Fio();
		var standalone = new standaloneProxy(argv);
		var routeHandler = new Fio.router(fio);
		var backend = new (Fio.stub());
		standalone.startProxy(routeHandler, backend);
		/*
		standalone.startProxy(routeHandler, backend);
		var routeHandler = new Fio.router(fio);
		standalone.startProxy(routeHandler, backend);
		*/
	}	

};

var serverFriendly = function(argv){
	argv = argv || {};
	argv['client'] = argv['_'][1] || '/client.folders.io';
	argv['compress'] = argv['compress'] || 'true' ;
	argv['log'] = argv['log'] || 'true' ;
	argv['listen'] = argv['listen'] || 8090 ;
	
	if ('provider' in argv){
		
		console.log('provider specified');
		var options = {}
		var t = argv['provider'].split(':');
		options.provider = t[0];
		options.shareId  = t[1];
		argv['mode'] = 'DEBUG' ;
		//var s = new Server(argv);
		// FIXME: Provider pattern is still a bit broken.
		/*
		var p = Fio.provider('local');
		p = new p(options,s);
		p.fioHandler();
		*/
		
		//FIXME: hardcode for FTP first
		
		//var backend = Fio.provider(options.provider).create('local');
		var FTPCredentialsConnString = "ftp://localhost:3333";
		var ftp_options = {
			connectionString: FTPCredentialsConnString,
			enableEmbeddedServer: true
		}
		var backend = Fio.provider('ftp', ftp_options).create('prefix');
		
		console.log('backend: ', backend);
		var server = new Server(argv,backend);
	}
	else{
		
		argv['mode'] = argv['mode'] || 'DEBUG';
		var fio = new Fio();
		var backend = new (Fio.stub());
		console.log('serverFriendly, backend: ', backend);
		var server = new Server(argv,backend);
	}	
};

var httpFriendly = function(argv){
	
	if ('provider' in argv){
		var options = {};
		var provider = argv['provider'];
		var options = {};
		var provider = argv['provider'] || 'local';
		options.prefix = argv['prefix'];
		options.host = argv['host'] || 'http://folders.io';
		options.cb = function(err){console.log(err);}
		options.provider = Fio.provider(provider).create(prefix);
		new FoldersHttp(options);
		
	}
	
}

cliHandler();
