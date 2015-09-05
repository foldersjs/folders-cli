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

var Cli = function (argv) {
    var self = this;
    self.currentDirectory = '/';
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
    default:
        // no module specified .trying to directly mount provider
        self.providerFriendly(argv);
        return
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
    if (!self.serverbackend) {

        return cb(new Error("Error! File system not mounted"));

    }
    path = path || '/';

    path = require('path').normalize(path);

    //FIXME: not using backend.stat to check target

    if (path == '/' || path == '~') {

        // change to root directory
        self.currentDirectory = '/';
    } else if (path[0] != '/') {

        // path is relative to current directory
        // append this path to current directory and normalize it 
        self.currentDirectory = require('path').join(self.currentDirectory, path);

    } else if (path[0] == '/') {
        self.currentDirectory = require('path').resolve('/', require('path').normalize(path));

    }




};

Cli.prototype.ls = function (path, cb) {

    var self = this,
        lsPath;

    if (!self.serverbackend) {

        return cb(new Error("Error! File system not mounted"));

    }

    path = path || self.currentDirectory;

    path = require('path').normalize(path);

    lsPath = path;

    //FIXME: not using backend.stat to check target

    if (path == '/' || path == '~') {

        // change to root directory
        lsPath = '/';
    } else if (path[0] != '/') {

        // path is relative to current directory
        // append this path to current directory and normalize it 
        lsPath = require('path').join(self.currentDirectory, path);


    } else if (path[0] == '/') {

        lsPath = require('path').resolve('/', path);


    }
    self.serverbackend.ls(lsPath, function (err, data) {

        if (err) {
            return cb(err);
        }

        data = data.map(function (x) {

            return x.name;

        });

        return cb(data);

    });




};

Cli.prototype.providerFriendly = function (argv) {

    // Using provider as backend file system on mounted protocol 
    // supporting cd ls cat put rmdir mkdir  commands
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

if (require.main.filename === __filename) {
    // this module is the main entry point for this nodejs process
    // compatibility for commands like node cli standalone --provider=ftp
    new Cli();
}


module.exports = Cli;