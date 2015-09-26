/*
 *
 * Vantage is heavy on dependencies but a nice way to present a REPL.
 * Suggest that npm install -g vantage is used if using the service.
 *
 */
var Cli = require('./cli');
var server = require("vorpal")();


// interfacing folders.io cli
server.cli = new Cli();

server
    .command("fs")
    .description("list currently available file systems ")
    .action(function (args, cb) {
        this.log(['local', 'stub', 'memory', 'aws', 'hdfs', 'pkgcloud'].join('\n'));
        return cb();
    });

server
    .command("servers")
    .description("list currently available embedded servers")
    .action(function (args, cb) {
        this.log(['ftp', 'ssh', 'http'].join('\n'));
        return cb();
    });

server
    .command("cd [DIR]")
    .description("Change the working directory.Change the current directory to DIR.")
    .autocompletion(function (text, iteration, cb) {


        autoComplete(text, iteration, "cd", cb);


    })
    .action(function (args, cb) {
        server.cli.cd(args.DIR);
        return cb();
    });

server
    .command("pwd")
    .description("Display present working directory.")
    .action(function (args, cb) {
        this.log(server.cli.currentDirectory);
        return cb();
    });


server
    .command("mount <mountpoint>")
    .option('-p, --provider <provider>', 'Mounts backend file system')
    .description("Adds a backend in union mode")
    .action(function (args, cb) {
        server.cli.mount(args.options.provider, args.mountpoint);
        return cb();
    });

server
    .command("umount <mountPoint>")
    .description("Un mounts a mount point in union mode")
    .action(function (args, cb) {
        server.cli.umount(args.mountPoint);
        return cb();
    });

server
    .command("dump")
    .description("Dumps json configuration file")
    .action(function (args, cb) {
        var config = server.cli.dump();
        server.log(config);
        return cb();
    });

server
    .command("cp <source> <destination>")
    .description("Dumps json configuration file")




.action(function (args, cb) {

    server.cli.cp(args.source, args.destination, function (err) {
        if (err) {
            server.log(err);
            return cb();

        }
        return cb();

    });



});


server
    .command("standalone [client]")
    .option('-s, --log', 'Capture and show request logs  on terminal.')
    .option('-c, --compress', 'Enable http compression .')
    .option('-m, --mode <mode>', 'Starts server in live | debug mode')
    .option('-l, --listen <port>', 'Starts standalone server on specified port.Default is 8090')
    .option('-p, --provider <provider>', 'Specify server backend provider.Default is local.')
    .option('--aws-config-file <config file>', 'Specify aws config file name')
    .option('--ftp-config-file <config file>', 'Specify ftp config file name')
    .option('--ssh-config-file <config file>', 'Specify ssh config file name')
    .description("start folders.io embedded http server")
    .alias('server')
    .action(function (args, cb) {
        args.options.client = args.client;
        args.options._ = ['standalone'];
        server.cli = new Cli(args.options);
        cb();
    });


// FIXME: not working 	
server
    .command("forward")
    .option('-f, --force', 'Force file overwrite.')
    .option('-a, --amount <coffee>', 'Number of cups of coffee.')
    .option('-v, --verbosity [level]', 'Sets verbosity level.')
    .option('-A', 'Does amazing things.')
    .description("start folders.io forwarding proxy")
    .action(function (args, cb) {
        console.log(args);
        cb();
    });

server
    .command("http-server")
    .description("Creates a public HTTP endpoint which serves the files and folders.")
    .action(function (args, cb) {
        this.log(this.server._port);
        cb();
    });

server
    .command("netstat [provider]")
    .description("Give approximate data usage for various providers")
    .action(function (args, cb) {
        var data = server.cli.netstat(args.provider);
        server.log((new Array(20)).join("-"));
        server.log(data);
        server.log((new Array(20)).join("-"));
        cb();
    });

server
    .command("ls [path]", "List files and folders.")
    .autocompletion(function (text, iteration, cb) {
        autoComplete(text, iteration, "ls", cb);




    })
    .action(function (args, cb) {

        server.cli.ls(args.path, function (err, data) {

            for (var i = 0; i < data.length; ++i) {

                server.log(data[i]);
            }

            cb();
        });

    });


server
    .delimiter('folders~$')
    .show();


server.parse(process.argv);

var matc = function (text, data) {
    var out = [];
    var len = data.length,
        i = 0;
    text = text.trim();
    if (text == "") {

        return data;
    }
    for (; i < len; i++) {
        var regex = new RegExp("^" + text);
        if (data[i].match(regex)) {
            out.push(data[i]);

        }

    }

    return out;
};


var longestComonSubstring = function (data) {

    if (data.length < 1) {

        return "";
    }
    data.sort();
    var s = data[0],
        e = data[data.length - 1];
    var ls = s.length;
    var i = 0;
    while (s[i] == e[i] && i < ls) {
        i++;
    }
    return s.substr(0, i);


};

var pathResolver = function (path) {


    path = require('path').normalize(path.trim());
    path = path || server.cli.currentDirectory;
    //path = path || "" ;


    var basename;
    var dirname;
    if (path[path.lastIndexOf('/')] != path[path.length - 1]) {
        basename = require('path').basename(path);
        dirname = require('path').dirname(path);
    } else {

        basename = '';
        dirname = path;
    }

    return [dirname, basename];

};

var autoComplete = function (text, iteration, cmd, cb) {


    var arr = pathResolver(text);
    var dir = arr[0];
    var tex = arr[1];

    if (iteration > 1) {
        // output all results which match with this text 

        server.cli.ls(dir, function (err, data) {
            var mat = matc(tex, data);
            if (mat.length > 0) {
                cb(void 0, mat);
            } else {
                cb(void 0, void 0);
            }

        });

    } else {

        server.cli.ls(dir, function (err, data) {
            var mat = matc(tex, data);

            if (text.trim() == "") {

                if (mat.length != 1) {
                    //cb(void 0, void 0);
                    cb(void 0, cmd + " " + longestComonSubstring(mat));

                } else {

                    cb(void 0, cmd + " " + mat[0] + '/');
                }

            } else {


                if (mat.length != 1) {
                    if (mat.length == 0) {

                        return cb(void 0, void 0);
                    }
                    var showPath = require('path').join(dir, longestComonSubstring(mat));
                    cb(void 0, cmd + " " + showPath);


                } else {

                    var showPath = require('path').join(dir, longestComonSubstring(mat));
                    cb(void 0, cmd + " " + showPath + '/');

                }


            }



        });


    }

};