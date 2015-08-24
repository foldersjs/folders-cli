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
//var	 forwardingProxy = require('folders-http/src/forwardingProxy');
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
	
	 
};


function configureFtp(Config, file){

	
	var ftp_options = {} ;
	file = file || 'ftp.json' ;
	Config =  Config || require("../" + file); 
	var backend  ;
	
	if (Config.backend.provider === 'aws'){
	    var aws_options = configureAws(Config.backend.options);
		backend = new FolderFs(Fio.provider('aws', aws_options).create('aws'))
		
	}
	
	// code for other backend synthetic file systems may come here 
	
	ftp_options.connectionString = Config.connectionString;
	ftp_options.enableEmbeddedServer = Config.enableEmbeddedServer;
	ftp_options.backend = backend ;
	return ftp_options ;
	
};

function configureAws(Config,file){
	file = file || 'aws.json' ;
    Config = Config || require("../" + file); 
	var aws_options = {} ;
	aws_options.accessKeyId = Config.accessKeyId;
	aws_options.secretAccessKey = Config.secretAccessKey;
	aws_options.service = Config.service;
	aws_options.region =  Config.region;
	aws_options.bucket =  Config.bucket	;
	return aws_options ;
	
	
};


function configureSsh(Config, file ){

	
	var ssh_options = {} ;
	file = file || 'ssh.json' ;
	Config = Config || require("../" + file );
		
	var backend  ;
	
	if (Config.backend.provider === 'aws'){
	    var aws_options = configureAws(Config.backend.options);
		backend = Fio.provider('aws', aws_options).create('aws')
		
	}
	
	ssh_options.connectionString = Config.connectionString;
	ssh_options.enableEmbeddedServer = Config.enableEmbeddedServer;
	ssh_options.backend = backend ;
	return ssh_options ;
	
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
		var options = {};
		var serverbackend ;
		var t = argv['provider'].split(':');

		var provider = t[0];
		var shareId  = t[1];
		
		argv['mode'] = 'DEBUG' ;
		

		if (provider === 'ftp'){
			var ftp_options = configureFtp(null,argv['ftp-config-file']); 
			serverbackend = Fio.provider(provider, ftp_options).create('prefix');
		}
		
		if (provider === 'ssh'){
			var ssh_options = configureSsh(null,argv['ssh-config-file']); 
			serverbackend = Fio.provider(provider, ssh_options).create('prefix');
		}
		
		if (provider === 'aws'){
			var aws_options = configureAws(null,argv['aws-config-file']); 
			serverbackend = Fio.provider(provider, aws_options).create('prefix');
		}
		
		 //?What is prefix!?
		
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
