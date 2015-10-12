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
//var Ftp = require('folders-ftp');
var Union = Fio.union();

var configMapper = {
    'local': configureLocal,
    'aws': configureAws,
    'ssh': configureSsh,
    'ftp': configureFtp
};

var CLIENT_URL = 'http://45.55.145.52:8000';


var Cli = function (argv) {
    var self = this;
    self.currentDirectory = '/';
    self.union = new Union(new Fio());
};

Cli.prototype.startModule = function (argv, cb) {
    var self = this;
    argv = argv || cli(process.argv.slice(2));
    var module = argv['_'][0];
    switch (true) {



    case (module == 'forward'):
        self.forwardFriendly(argv)
        break;

    case (module == 'standalone'):
    case (module == 'server'):

        self.standaloneFriendly(argv, cb);
        break;

    case (module == 'folders-http'):
        self.httpFriendly(argv);
        break;
    }

};

Cli.prototype.standaloneFriendly = function (argv, cb) {

    var self = this;

    self.serverFriendly(argv, cb);

};


Cli.prototype.serverFriendly = function (argv, cb) {
    var self = this;
    argv = argv || {};
    argv['client'] = argv['client'] || argv['_'][1] || false;
    argv['compress'] = argv['compress'] || false;
    argv['log'] = argv['log'] || false;
    argv['listen'] = argv['listen'] || 8090;
    argv['mode'] = argv['mode'] || 'DEBUG';

    if (argv['mode'] == 'DEBUG') {

        self.providerFriendly(argv, function (err, serverbackend) {
            if (err) {

                return cb(err);
            }
            var server = new Server(argv, serverbackend);

            // make a call to remote host to mount this cli instance

            if (CLIENT_URL) {
                var host = 'localhost';
                var port = argv['listen'];
                var uri = CLIENT_URL + '/mount?instance=' + host + '&port=' + port;
                require('http').get(uri, function (res) {
                    var content = '';
                    res.on('data', function (d) {
                        content += d.toString();
                    });


                    res.on('end', function () {
                        var instanceId = JSON.parse(content).instance_id;
                        var instanceUrl = CLIENT_URL + '/instance/' + instanceId;
                        console.log("Browse files here -->" + instanceUrl);
                        return cb();
                    });
					
					res.on('err',function(err){
						
						return cb(err);
					});
					

                });


            } else {
                return cb();
            }

        });

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

    if (self.currentDirectory[self.currentDirectory.length - 1] != '/') {

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


    self.union.ls(lsPath, function (err, result) {

        if (err) {
            return cb(err);
        }

        var list = result.map(function (x) {

            return x.name;
        });

        return cb(null, list);

    });


};

Cli.prototype.mount = function (provider, mountPoint, cb) {


    var self = this;
    var mount = {};

    configMapper[provider](null, null, function (err, result) {

        if (err) {

            return cb(err);
        }

        mount[mountPoint] = Fio.provider(provider, result);
        self.union.setup({
            "view": "list"
        }, [mount]);
        return cb();
    });

};

Cli.prototype.umount = function (mountPoint) {

    var self = this;

    if (!mountPoint) {

        return;
    }

    self.union.umount(mountPoint);


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

};


Cli.prototype.providerFriendly = function (argv, cb) {

    // Using provider as backend file system on mounted protocol 
    // supporting cd ls cp  commands
    var self = this,
        provider;
    argv['provider'] = argv['provider'] || 'aws';
    argv['provider'] = argv['provider'].split(':')[0];
    argv['shareId'] = argv['provider'].split(':')[1];

    provider = argv['provider'];

    var serverbackend;

    configMapper[provider](null, argv[provider + "-config-file"], function (err, result) {

        if (err) {

            return cb(err);
        }
        serverbackend = Fio.provider(provider, result).create('prefix');
        // if  backend not mounted fusing the backend with other mounts
        if (!self.union.fuse[provider])
            self.union.fuse[provider] = serverbackend;
        cb(null, serverbackend);

    });

};

Cli.prototype.dump = function () {
    var self = this;
    var mounts = self.union.fuse;
    var config = {};
    for (name in mounts) {

        if (mounts.hasOwnProperty(name)) {

            config[name] = mounts[name].dump();

        }
    }

    return config;

};

Cli.prototype.netstat = function (provider) {
    var dataStats = {};
    var providers = Fio.providers;

    for (name in providers) {

        if (providers[name].dataVolume) {

            dataStats[name] = providers[name].dataVolume();

        }
    }

    return dataStats;
};


function configureFtp(config, file, cb) {
    file = file || 'ftp.json';
    config = config || require("../" + file);
    var backend;

    configMapper[config.backend.provider](config.backend.options, null, function (err, result) {
        if (err) {

            return cb(err);
        }

        backend = Fio.provider(provider, result).create(provider);
        config.backend = backend;
        return cb(null, config);

    });
};

function configureAws(config, file, cb) {
    file = file || 'aws.json';
    config = config || require("../" + file);
    require('folders-aws').isConfigValid(config, function (err, awsConfig) {

        if (err) {

            console.log(err);
            return cb(err);
        } else {
            return cb(null, awsConfig);
        }
    })


};


function configureSsh(config, file, cb) {

    file = file || 'ssh.json';
    config = config || require("../" + file);

    var backend;
    configMapper[config.backend.provider](config.backend.options, null, function (err, result) {

        if (err) {

            return cb(err);
        }

        backend = Fio.provider(provider, result).create(provider);
        config.backend = backend;
        return cb(null, config);

    });

};

function configureLocal(config, file, cb) {

    var local_options = {};
    return cb(null, local_options);

};

if (require.main.filename === __filename) {
    // this module is the main entry point for this nodejs process
    // compatibility for commands like node cli standalone --provider=ftp
    var service = new Cli();

    service.startModule(cli(process.argv.slice(2)), function (err, data) {

        if (err) {

            //throw new Error(err);
        }
        // place holder ;



    });

}

module.exports = Cli;