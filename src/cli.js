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


var	 cli = require('minimist');
var	 FoldersHttp = require('folders-http');	
var	 forwardingProxy = require('folders-http/src/forwardingProxy');
var	 Server = require('folders-http/src/standaloneServer');
var	 Fio = require('folders');
//Used to wrap a provider in Nodejs-compatible mode!
var FolderFs = require('folders/src/fs');
var Ftp = require('folders-ftp');

var cliHandler = function(){
	var argv = cli(process.argv.slice(2));
	var module = argv['_'][0];
	
	switch(true){
		

		case (module == 'forward'):
			forwardFriendly(argv)
			break;

		case (module == 'standalone'):
		case (module == 'server'): 

			standaloneFriendly(argv);
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
		options.shareId	 = argv['shareid'] = t[1];
		var f = new forwardingProxy(argv);
		f.startProxy();
	
	}else{
		var forward = new forwardingProxy(argv)
		forward.startProxy()
	}
};



var standaloneFriendly = function(argv){
	
	serverFriendly(argv);
	
	 // FIXME:delete below part in future 
		
	/*
	argv = argv || {};
	if ('provider' in argv){
		console.log('standaloneFriendly provider:', provider);
		var options = {}
		var t = argv['provider'].split(':');
		options.provider = t[0];
		options.shareId	 = t[1];
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
		
		//standalone.startProxy(routeHandler, backend);
		//var routeHandler = new Fio.router(fio);
		//standalone.startProxy(routeHandler, backend);
	}	
	*/
};

var ssh_options = {
		// the connection string, format: ssh//username:password@host:port
		connectionString : "ssh://test:123456@localhost:3334",
		// the option to start up a embedded server when inin the folders, used in test/debug
		enableEmbeddedServer : true
};

var aws_options = {
		   accessKeyId: "AWS access key",
		   secretAccessKey : "AWS secret Id",
		   service : 'S3',
		   region: 'us-west-2',
		   bucket: 'mybucket.test.com'
		   
};

var ftp_options = {
		connectionString: "ftp://localhost:3333",
		enableEmbeddedServer: true,
		backend:new FolderFs(Fio.provider('aws', aws_options).create('aws'))
};

var providersConfig = {
	
	'ftp' : ftp_options,
	'ssh' : ssh_options,
	'aws' : aws_options	
};


var serverFriendly = function(argv){
	argv = argv || {};
	argv['client'] = argv['_'][1] ;
	argv['compress'] = argv['compress'] || 'true' ;
	argv['log'] = argv['log'] || 'true' ;
	argv['listen'] = argv['listen'] || 8090 ;
	argv['mode'] = argv['mode'] || 'DEBUG' ; 
	

	if ('provider' in argv) {
		
		console.log('provider specified');
		var options = {}
		var t = argv['provider'].split(':');

		var provider = t[0];
		var shareId  = t[1];
		
		argv['mode'] = 'DEBUG' ;
		
		var serverbackend = Fio.provider(provider, providersConfig[provider]).create('prefix');//?What is prefix!?
		
		//console.log('backend: ', backend);
		var server = new Server(argv, serverbackend);
		/*
		if (argv['mode'] == 'LIVE'){
			
			// live or provider mode not correctly implemented yet 
			
			argv['backend'] = argv['backend'] || 'local' ;
	
	
			// using 'local' for backend now.neglecting backend 
			var Local = Fio.local();
	
	
			var backend = new Local();
			var server = new Server(argv,backend);
		*/		

	}
	else{


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
