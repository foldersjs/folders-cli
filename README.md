# folders-cli
Command line package for sending files and folders between various server protocols.


Building and running
====================

Install [node.js](http://nodejs.org/download/) and make sure you can run npm from the command line.

### Installation 

Installation (use --save to save to package.json)

```sh
npm install folders-cli
```

folders-http
===============

This module adds a http transport layer for 'folders.io' file and folders request.
It opens route to folders.io service which is running on remote host or on a 
local machine.

```
node cli folders-http 

```

This opens a route to **http://folders.io** serving local file system by default.It gives you a 'shareid'

which you can share with anyone to whom you want to share your file system


Users on the receiving end can make following requests to access your files and folders

### ls

```
curl http://folders.io/dir/shareid

```
### cat

```
curl http://folders.io/file/fileid
```

To use provider other then 'local' file system ,use **provider** switch

```
node cli folders-http --provider 'ftp' 
```

## PROXY SERVICES

There is a proxy server which can be used to forward client requests to remote hosts .
The functionality of this proxy server can be modified or configured with the use of various command line switches.

### Basic Usage

Starts a proxy server on port 8090 and proxy all requests to folders.io

```
node cli forward 

```
Starts a proxy server on port 9999 and proxy all requests to folders.io

```
node cli forward --listen=9999
```

Starts a proxy server on port 9999 and proxy all requests to folders.io

```
node cli forward --listen=9999 --forward=http://folders.io
```

### Modes

Along with the above mentioned switches , proxy server also supports few modes


In mode 0 all requests are mapped to a single share ID and cookie (token), as set by the command line/hard code variable.

Users can omit 'shareId' from requests  and 'session' headers and all their requests will be mapped to 'shareid' and 'sessions' as supplied in command line
For requests which do not require sessions or shareids ,they will be simply forwarded upstream.

```
$ node cli forward --mode 0 --shareid=testshareid --token=sessioncookie

//Example

$ node cli forward --mode 0 --shareid="f3fe855d-7051-40e8-a88d-2bcfb23c5e96"--token="FIOSESSIONID=156AE139308A9629028D7E31EE1C0E43"

```


In mode 1  all 'share IDs' created are mapped  to a single cookie (session token).This cookie is automatically obtained by proxy on start up
on first request which retains it until proxy server restarted.Users do not have to add headers in their requests as 
proxy server will automatically add the session before forwarding request .

```
$ node cli forward --mode 1 
````


In mode 2 all share IDs created are mapped to a token each time one is created and used.

````
$ node cli forward --mode 2 
`````
In  mode 3 tokens are mapped based on whatever cookie the browser has set so the session id 
in the browser gets mapped to a session id on the server.

````
$ node cli forward --mode 3
```

## Server Services

There is also a standalone server which can be used for testing /debugging as well as live handling of requests .

By default it runs on port 8090 and  in 'DEBUG' mode. 

```
$ node cli standalone
```

'DEBUG' mode can be explicitly  mentioned by using switch **--mode= DEBUG**.In
'DEBUG' mode requests are answered with 'stub' responses.

```
$ node cli standalone --mode DEBUG
```

To change the port use 'listen' switch.  

```
$ node cli standalone --listen=9999
```

To use different client  simply pass in the path of root folder.

```
$ node cli standalone  ./client.folders.io --listen=9999
```

Still Working
============

The "folders" folder includes modules for connecting to various file systems.The services of these modules
can be accessed with the help of **--provider=module** switch .For example to use 'stub' module.

```
$ node cli standalone --provider = stub
```

Additionally one  can pass shareid also.

```
$ node cli standalone --provider = stub:testshareid
```
