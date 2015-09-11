/*
 *
 * Vantage is heavy on dependencies but a nice way to present a REPL.
 * Suggest that npm install -g vantage is used if using the service.
 *
 */
var Cli = require('./cli');
var server = require("vorpal")();



server
    .command("fs")
    .description("list currently available file systems ")
    .action(function (args, cb) {
        this.log(['local', 'stub', 'memory', 'aws', 'hdfs', 'pkgcloud'].join('\n'));
        cb();
    });

server
    .command("servers")
    .description("list currently available embedded servers")
    .action(function (args, cb) {
        this.log(['ftp', 'ssh', 'http'].join('\n'));
        cb();
    });

server
    .command("cd [DIR]")
    .description("Change the working directory.Change the current directory to DIR.")
    .action(function (args, cb) {
        if (!server.cli) {
            this.log("Error ! Mount the file system first");

        } else {

            server.cli.cd(args.DIR);
        }
        cb();

    });

server
    .command("pwd")
    .description("Display present working directory.")
    .action(function (args, cb) {
        if (!server.cli) {
            this.log("Error ! Mount the file system first");

        } else {

            this.log(server.cli.currentDirectory);
        }
        cb();

    });

server
    .command("ls [path]")
    .description("List information about the FILEs (the current directory by default).")
    .action(function (args, cb) {

        if (!server.cli) {

            cb();

        } else {

            server.cli.ls(args.path, function (err, data) {

                for (var i = 0; i < data.length; ++i) {

                    server.log(data[i]);
                }

                cb();
            });
        }

    });


server
    .command("mount")
    .option('-p, --provider <provider>', 'Mounts backend file system')
    .description("Adds a backend in union mode")
    .action(function (args, cb) {

        if (!server.cli) {

            server.cli = new Cli();
        }

        server.cli.mount(args.options.provider);

        cb();
    });

server
    .command("umount")
    .option('-p, --provider <provider>', ' Un mounts backend file system')
    .description("Un mounts a backend in union mode")
    .action(function (args, cb) {
        if (!server.cli) {

            this.log("Error ! Nothing is mounted");
            return;
        }

        server.cli.umount(args.options.provider);
        cb();
    });

server
    .command("dump")
    .description("Dumps json configuration file")
    .action(function (args, cb) {
        this.log("FIXME");
        cb();
    });

server
    .command("cp <source> <destination>")
    .description("Dumps json configuration file")
    .action(function (args, cb) {
        if (!server.cli) {

            server.log("Error! No file system is mounted");

            return cb();


        }

        server.cli.cp(args.source, args.destination, function (err) {

            if (err) {
                server.log(err);
                return cb();

            }
            cb();

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
    .delimiter('folders~$')
    .show();

server.parse(process.argv);