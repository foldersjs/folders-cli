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
var SyncUnion = Fio.syncUnion();

var configMapper = {
    'local': configureLocal,
    'aws': configureAws,
    'ssh': configureSsh,
    'ftp': configureFtp,
    'hdfs': configureHdfs,
    'hive' : configureHive,
    'presto': configurePresto
};

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

    case (module == 'sync'):
        self.sync(argv);
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
    //argv['clientUri'] = argv['clientUri'];
    argv['client'] = argv['client'] || argv['_'][1] || false;
    argv['clientPort'] = argv['clientPort'] || 8000;
    argv['compress'] = argv['compress'] || false;
    argv['log'] = argv['log'] || false;
    argv['listen'] = argv['listen'] || 8080;
    argv['host'] = argv['host'] || "0.0.0.0";
    argv['mode'] = argv['mode'] || 'DEBUG';

    argv['secured'] = argv['secured'] || false;
    argv['userPublicKey'] = argv['userPublicKey'];
    
    console.log('serverFriendly', argv);

    if (argv['mode'] == 'DEBUG') {

        self.providerFriendly(argv, function (err, serverbackend) {
            if (err) {
                return cb(err);
            }
            var server = new Server(argv, serverbackend);
            // Connecting this host with Java services at remote address
            
            if (argv['clientUri']) {
                server.mountInstance(cb,argv['clientUri']);    
            }
            else {
                console.log("no clientUri, running Intranet mode!");
                cb();
            }
            
        });

    }


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

Cli.prototype.sync = function(argv) {

    console.log('sync start in Cli...');
    var file = 'sync.json';
    var config = require("../" + file);
    var sourceProvider = config.mounts.source;
    var destProvider = config.mounts.destination;

    // Provider opts check,
    // if not specified the provider opts, we read from specified config file or default config file.
    configMapper[sourceProvider.module](sourceProvider.opts, sourceProvider.configFile, function(err, sourceOpts) {
      sourceProvider.opts = sourceOpts;

      configMapper[destProvider.module](destProvider.opts, destProvider.configFile, function(err, destOpts) {
        destProvider.opts = destOpts;
        var syncUnion = new SyncUnion(config.mounts, config.options);

        if (config.options.cronTime) {
          console.log('start schedule sync...');
          // schedule Sync files. eg, "*/1 * * * *", every 1 minutes.
          syncUnion.scheduleSync(config.options.cronTime);
        } else {
          console.log('start one time sync...');
          // one time files sync.
          syncUnion.sync(function(err, result) {
            if (err) {
              return console.log('union sync error: ', err);
            }

            console.log('union sync success, ', result);
          });
        }

      });
    });
}

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
    argv['provider'] = argv['provider'] || 'local';
    /*
    argv['provider'] = argv['provider'].split(':')[0];
    argv['shareId'] = argv['provider'].split(':')[1];
    */

    provider = argv['provider'];
    var providers = {};
    
    if (typeof(provider) == 'object') {
        console.log('multiple providers found');
        providers = provider;
    }
    else if (typeof(provider) == 'string') {
        //single provider, remap to the new data type!?
        providers[provider] =  {"type": provider, "configFile": argv[provider + "-config-file"]};
    }
    console.log('providers:', providers);
    
    var providerCount = Object.keys(providers).length;
    console.log('providerCount: ', providerCount);
    
    //var serverbackend;
    
    var count = 0;
    
    //   now acts like a pre-checking of the backend
    for (var key in providers) {
        (function(key) { //create a function scope
            var providerName = key;
            var provider = providers[providerName].type;
            var configFile = providers[providerName].configFile;
            console.log('provider: ', provider);
            
            configMapper[provider](null, configFile, function (err, result) {
                console.log('configMapper ' + provider + ' result: ', result);
                count+=1;
                
                if (err) {
                    return cb(err);
                }
                
                //seems like prefix is not used at the moment!
                serverbackend = Fio.provider(provider, result).create('/folders.io_0:'+provider+'/');
                
                //if  backend not mounted fusing the backend with other mounts
                //console.log('add to union: ', serverbackend.prefix)
                if (!self.union.fuse[providerName])
                    self.union.fuse[providerName] = serverbackend;
                    
                if (count == providerCount){
                    console.log("all providers initialized!");
                    cb(null, self.union);
                }
                
                //if (!self.union.fuse[serverbackend.prefix])
                //    self.union.fuse[serverbackend.prefix] = serverbackend;
                
                //cb(null, serverbackend);
                
                //FIXME: do not callback here yet but should wait for all mounts to be ready first!
                //Using promise!?
                //cb(null, self.union);
            });
        })(key);
    }
    

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

/*
Cli.prototype.netstat = function (provider) {
    var TXOK = 0;
    var RXOK = 0;

    var providers = Fio.providers;

    for (name in providers) {

        if (providers[name].dataVolume) {

            TXOK += providers[name].dataVolume().TXOK;
            RXOK += providers[name].dataVolume().RXOK;

        }
    }


    return {
        TXOK: TXOK,
        RXOK: RXOK
    };

};
*/


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
            return cb(err);
        } else {
            return cb(null, awsConfig);
        }
    })
};

function configureHive(config, file, cb) {
  file = file || 'hive.json';
  config = config || require("../" + file);

  require('folders-hive').isConfigValid(config, function(err, hiveConfig){
    if (err){
      cb(err);
    } else {
      return cb(null, hiveConfig);
    }
  });
}

function configurePresto(config, file, cb) {
	file = file || 'presto.json';
	config = config || require("../" + file);

	require('folders-presto').isConfigValid(config, function(err, prestoConfig){
		if (err){
			cb(err);
		} else {
			return cb(null, prestoConfig);
		}
	});

}

function configureHdfs(config, file, cb) {
    file = file || 'hdfs.json';
    config = config || require("../" + file);
  
    require('folders-hdfs').isConfigValid( config,function(err, hdfsConfig) {
        if (err) {
          return cb(err);
        }

        // we want to start a embedded proxy when init
        if (hdfsConfig.startEmbeddedProxy && hdfsConfig.backend && hdfsConfig.backend.provider) {
          console.log('hdfsConfig.backend, ', hdfsConfig.backend);
          configMapper[hdfsConfig.backend.provider](hdfsConfig.backend.options, null, function(err, result) {

            if (err) {
              return cb(err);
            }

            console.log('config hdfs backend folders,');
            var backend = Fio.provider(hdfsConfig.backend.provider, result).create(
                '/folders.io_hdfs_0:' + hdfsConfig.backend.provider + '/');
            console.log(backend);
            hdfsConfig.backend.instance = backend;

            return cb(null, hdfsConfig);

          });
        } else {
          return cb(null, hdfsConfig);
        }
    });
}

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
	console.log('Current directory: ' + process.cwd());
    // this module is the main entry point for this nodejs process
    // compatibility for commands like node cli standalone --provider=ftp
    var service = new Cli();

    service.startModule(cli(process.argv.slice(2)), function (err, data) {

        if (err) {

            //throw new Error(err);
        }
        // place holder ;
    });

}else if (require('path').basename(require.main.filename) == 'app.js'){

	
	var service = new Cli();
	var config=require('../config.json')[process.env.NODE_ENV || 'development'];
	 service.startModule(config, function (err, data) {

        if (err) {

            //throw new Error(err);
        }
        // place holder ;
    });
	
}

module.exports = Cli;