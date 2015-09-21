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
var FoldersHttp = require('folders-http');
//var	 forwardingProxy = require('folders-http/src/forwardingProxy');
var Server = require('folders-http/src/standaloneServer');
var Fio = require('folders');
//Used to wrap a provider in Nodejs-compatible mode!
var FolderFs = require('folders/src/fs');
var Ftp = require('folders-ftp');
var Union = Fio.union();
var mapper = {};


var Cli = function (argv) {
    var self = this;
    self.currentDirectory = '/';
    self.union = new Union(new Fio());
    argv = argv || cli(process.argv.slice(2));
    var module = argv['_'][0];

    switch (true) {


    case (module == 'forward'):
        self.forwardFriendly(argv)
        break;

    case (module == 'standalone'):
    case (module == 'server'):

        self.standaloneFriendly(argv);
        break;

    case (module == 'folders-http'):
        self.httpFriendly(argv);
        break;
    }

};


Cli.prototype.standaloneFriendly = function (argv) {

    var self = this;

    self.serverFriendly(argv);

};

Cli.prototype.serverFriendly = function (argv) {
    var self = this;
    argv = argv || {};
    argv['client'] = argv['client'] || argv['_'][1] || false;
    argv['compress'] = argv['compress'] || false;
    argv['log'] = argv['log'] || false;
    argv['listen'] = argv['listen'] || 8090;
    argv['mode'] = argv['mode'] || 'DEBUG';

    if (argv['mode'] == 'DEBUG') {

        self.providerFriendly(argv);

        var server = new Server(argv, self.serverbackend);

    }


    /*
		if (argv['mode'] == 'LIVE'){
			
			// live or provider mode not correctly implemented yet 
			
			argv['backend'] = argv['backend'] || 'local' ;
	
	
			// using 'local' for backend now.neglecting backend 
			var Local = Fio.local();
	
	
			var backend = new Local();
			var server = new Server(argv,backend);
		*/
};

Cli.prototype.httpFriendly = function (argv) {

    if ('provider' in argv) {
        var options = {};
        var provider = argv['provider'];
        var options = {};
        var provider = argv['provider'] || 'local';
        options.prefix = argv['prefix'];
        options.host = argv['host'] || 'http://folders.io';
        options.cb = function (err) {
            console.log(err);
        }
        options.provider = Fio.provider(provider).create(prefix);
        new FoldersHttp(options);

    }

};


Cli.prototype.forwardFriendly = function (argv) {

    if ('provider' in argv) {
        var options = {}
        var t = argv['provider'].split(':');
        options.provider = t[0];
        options.shareId = argv['shareid'] = t[1];
        var f = new forwardingProxy(argv);
        f.startProxy();

    } else {
        var forward = new forwardingProxy(argv)
        forward.startProxy()
    }
};

Cli.prototype.cd = function (path) {

    var self = this;

    path = path || '/';

    path = require('path').normalize(path);

    //FIXME: not using backend.stat to check target

    if (path == '/' || path == '~') {

        self.currentDirectory = '/';
    } else if (path[0] != '/') {
        self.currentDirectory = require('path').join(self.currentDirectory, path);

    } else if (path[0] == '/') {
        self.currentDirectory = require('path').resolve('/', require('path').normalize(path));

    }
	
	if (self.currentDirectory[self.currentDirectory.length -1] != '/'){
	
		self.currentDirectory = self.currentDirectory + '/';
	}

};

Cli.prototype.ls = function (path, cb) {

    var self = this,
        lsPath;

    path = path || self.currentDirectory;

    path = require('path').normalize(path);

    lsPath = path;


    //FIXME: not using backend.stat to check target

    if (path[0] == '/' || path == '~') {
        lsPath = require('path').resolve('/', path);
    } else if (path[0] != '/') {
        lsPath = require('path').join(self.currentDirectory, path);

    }


    lsPath = mountPoint(lsPath);
    self.union.ls(lsPath, function (err, result) {

        if (err) {
            return cb(err);
        }

        var list = result.map(function (x) {

            return mapper[x.name] || x.name;
        });

        return cb(null, list);

    });


};


Cli.prototype.mount = function (provider, mountpoint) {


    var self = this;
    if (provider === 'aws') {
        self.union.setup({
            "view": "list"
        }, [{
            "aws": Fio.provider('aws', configureAws())
        }]);
        !mapper[provider] && (mapper[provider] = mountpoint || provider);

    }

    if (provider === 'local') {
        self.union.setup({
            "view": "list"
        }, [{
            "local": Fio.provider('local', configureLocal())
        }]);
        !mapper[provider] && (mapper[provider] = mountpoint || provider);

    }


};

Cli.prototype.umount = function (provider) {

    var self = this;

    if (!provider) {

        return;
    }

    self.union.umount(provider);
    if (mapper[provider]){
        delete mapper[provider];
	}


};

Cli.prototype.cp = function (source, destination, cb) {

    var self = this;

    if (!source) {
        return cb(new Error("cli cp: Error ! missing source file operand"));
    }

    if (!destination) {
        return cb(new Error("cli cp: Error ! missing destination file operand"));
    }

    source = require('path').normalize(source);
    destination = require('path').normalize(destination);

    if (source[0] != '/') {

        source = require('path').join(self.currentDirectory, source)
    } else if (source[0] == '/') {

        source = require('path').resolve('/', source);
    }

    if (destination[0] != '/') {

        destination = require('path').join(self.currentDirectory, destination)
    } else if (destination[0] == '/') {

        destination = require('path').resolve('/', destination);
    }

    self.union.cp(source, destination, cb);
    source = mountPoint(source);
    destination = mountPoint(destination);


};

Cli.prototype.providerFriendly = function (argv) {

    // Using provider as backend file system on mounted protocol 
    // supporting cd ls cp  commands
    var self = this,
        provider;
    argv['provider'] = argv['provider'] || 'aws';
    argv['provider'] = argv['provider'].split(':')[0];
    argv['shareId'] = argv['provider'].split(':')[1];

    provider = argv['provider'];

    var serverbackend;

    if (provider === 'ftp') {
        var ftp_options = configureFtp(null, argv['ftp-config-file']);
        serverbackend = Fio.provider(provider, ftp_options).create('prefix');
    }

    if (provider === 'ssh') {
        var ssh_options = configureSsh(null, argv['ssh-config-file']);
        serverbackend = Fio.provider(provider, ssh_options).create('prefix');
    }

    if (provider === 'aws') {

        var aws_options = configureAws(null, argv['aws-config-file']);
        serverbackend = Fio.provider(provider, aws_options).create('prefix');
    }


    self.serverbackend = serverbackend;

    // if  backend not mounted fusing the backend with other mounts
    if (!self.union.fuse[provider])
        self.union.fuse[provider] = serverbackend;

};

Cli.prototype.dump = function(){
	var self = this;
	var mounts = self.union.fuse ;
	var config = {} ;
	for (name in mounts){
	
		if (mounts.hasOwnProperty(name)){
			
			try {
    			config[name] = require(require('path').join('../',name+'.json'));
			}
			catch (e) {
    			// Error loading in config file for this mounted file system 
				config[name] = "No config file present" ;
			}
			
		}
	}
	
	return config ;
	
};
function configureFtp(Config, file) {


    var ftp_options = {};
    file = file || 'ftp.json';
    Config = Config || require("../" + file);
    var backend;

    if (Config.backend.provider === 'aws') {
        var aws_options = configureAws(Config.backend.options);
        backend = new FolderFs(Fio.provider('aws', aws_options).create('aws'))

    }

    // code for other backend synthetic file systems may come here 

    ftp_options.connectionString = Config.connectionString;
    ftp_options.enableEmbeddedServer = Config.enableEmbeddedServer;
    ftp_options.backend = backend;
    return ftp_options;

};

function configureAws(Config, file) {
    file = file || 'aws.json';
    Config = Config || require("../" + file);
    var aws_options = {};
    aws_options.accessKeyId = Config.accessKeyId;
    aws_options.secretAccessKey = Config.secretAccessKey;
    aws_options.service = Config.service;
    aws_options.region = Config.region;
    aws_options.bucket = Config.bucket;
    return aws_options;


};


function configureSsh(Config, file) {


    var ssh_options = {};
    file = file || 'ssh.json';
    Config = Config || require("../" + file);

    var backend;

    if (Config.backend.provider === 'aws') {
        var aws_options = configureAws(Config.backend.options);
        backend = Fio.provider('aws', aws_options).create('aws')

    }
    // code for other backend synthetic file systems may come here 

    ssh_options.connectionString = Config.connectionString;
    ssh_options.enableEmbeddedServer = Config.enableEmbeddedServer;
    ssh_options.backend = backend;
    return ssh_options;

};

function configureLocal(Config, file) {

    var local_options = {};
    return local_options;

};

if (require.main.filename === __filename) {
    // this module is the main entry point for this nodejs process
    // compatibility for commands like node cli standalone --provider=ftp
    new Cli();
}

// FIXME: regex will be the cleaner way 
function mountPoint(lsPath) {

    if (mapper['aws'] && lsPath.substr(0, mapper['aws'].length + 1) === '/' + mapper['aws']) {
        lsPath = "/aws" + lsPath.substr(mapper['aws'].length + 1, lsPath.length)
    } else if (mapper['local'] && lsPath.substr(0, mapper['local'].length + 1) === '/' + mapper['local']) {
        lsPath = "/local" + lsPath.substr(mapper['local'].length + 1, lsPath.length)
    }
    return lsPath;

}

module.exports = Cli;