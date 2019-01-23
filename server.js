/*
    Ono V 1.0.0
    Written by Kevin Bae
    Fall 2018
*/

"use strict";

require('dotenv').config();

const PORT = process.env.PORT || 443;
const bodyParser = require('body-parser');
const validator = require('validator');
const express = require('express');
const request = require('request-promise');
const cookieParser = require('cookie-parser');
const https = require('https');
const path = require('path');
const fs = require('fs');
const rp = require('request-promise');
const querystring = require('querystring');
const soap = require('soap');
const csrf = require('csurf');
const ESAPI = require( 'node-esapi' );


//BigBro Config
const big_bro_uri = [BIG_BRO_URI];
const bluecat_config = {
    id: [BLUECAT_ID],
    wsdl: [BLUECAT_WSDL],
    user: [BLUECAT_USER],
    password: [BLUECAT_PASSWORD]
}
let cookie;
BC_login();

//Certificate Config
const certOptions = {
  key: fs.readFileSync(path.resolve([server_key])),
  cert: fs.readFileSync(path.resolve([server_crt]))
}

//Server Config
let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/", express.static(__dirname+"/static"));

//Security Config
app.disable('x-powered-by');
app.use(ESAPI.middleware());

//Import Bower Components
app.use("/bower_components/", express.static(__dirname+"/bower_components"));

//Set homepage
app.get('/', function (req, res) {
    res.sendFile(__dirname+'/index.html');
});




/***************** WHOWAS ********************/

app.post('/whowas_searches', async function(req, res) {
    console.log("\n\nREQUEST RECEIVED: ");
    console.log(req.body)
    console.log("\n\n");

    let ip_address =    req.body.whowas_search.ip.replace(/ /g,'');
    let port =          req.body.whowas_search.port.replace(/ /g,'');
    let timestamp =     req.body.whowas_search.timestamp.replace(/ /g,'');

    if(!(ValidateIPaddress(ip_address))) {
        console.log("ERROR: Invalid IP Address");
        console.log("IP:[" + ip_address + "]");
        res.status(500).send({ error: 'Invalid IP Address' });
        return;
    }
    if(!(ValidateTimeStamp(timestamp))) {
        console.log("ERROR: Invalid ISO 8601 Timestamp");
        console.log("TIMESTAMP:[" + timestamp + "]");
        res.status(500).send({ error: 'Invalid ISO 8601 Timestamp' });
        return;
    }


    let ip_arr = ip_address.split(".");
    for(let i = 0; i < ip_arr.length; i++) {
        ip_arr[i] = parseInt(ip_arr[i]);
    }

    
    console.log("RECIPE IS:");
    let recipe = recipeTable(ip_arr);
    console.log(recipe + "\n");
    let JSON_response = {};



    if(recipe === "VPN") {
        let vpn_options = vpn(timestamp, ip_address);
        rp(vpn_options)
            .then(function (data) {
                console.log("VPN RESPONSE RECEIVED:");
                if(data.hits.total > 0) {
                    JSON_response.VPN = data.hits.hits[0];
                    JSON_response._source = {};
                    JSON_response._source.username = data.hits.hits[0]._source.username;
                    console.log(data.hits.hits[0]);                
                    console.log("\n\n");
                    res.send(JSON_response);
                }
                else {
                    console.log("NO HITS:");
                    console.log(data);
                    console.log("\n\n");

                    res.status(404).send({ error: 'No hits found' })
                }
            })
            .catch(function (err) {
                console.error("REQUEST FAILED:");
                console.log(err);
                console.log("\n\n");
                res.status(500).send({ error: 'Request failed!' })
            });
    }




    else if(recipe === "Wireless Secure" ) {
        if(port == "") 
            res.status(412).send({ error: 'Please provide port number' })
        else {
            let firewall_options = firewall(timestamp, ip_address, port);
             
            rp(firewall_options)
                .then(async function (data) {
                    console.log("FIREWALL RESPONSE RECEIVED:");
                    if(data.hits.total > 0) {
                        console.log(data.hits.hits[0]);
                        JSON_response.FIREWALL = data.hits.hits[0];
                        let dst_ip = data.hits.hits[0]._source.dst_ip;
                        if(!(ValidateIPaddress(dst_ip))) {
                            console.log("ERROR: Invalid IP Address");
                            console.log("IP:[" + dst_ip + "]");
                            res.status(500).send({ error: 'Invalid IP Address' });
                            return;
                        }
                        let dhcp_options = dhcp(timestamp, dst_ip);

                        rp(dhcp_options)
                            .then(async function (data) {
                                console.log("DHCP RESPONSE RECEIVED:");
                                if(data.hits.total > 0) {
                                    JSON_response.DHCP = data.hits.hits[0];
                                    console.log(data.hits.hits[0]);
                                    let MAC_addr = data.hits.hits[0]._source.sourceMAC;
                                    let MAC_addr2 = MAC_addr.replace(/:/g, "-");
                                    let ise_options = ise(timestamp, MAC_addr2);

                                    rp(ise_options)
                                        .then(async function (data) {
                                            console.log("ISE ESPONSE RECEIVED:");
                                            if(data.hits.total > 0) {
                                                JSON_response.ISE = data.hits.hits[0];
                                                JSON_response._source = {};
                                                JSON_response._source.username = data.hits.hits[0]._source.username;
                                                console.log(data.hits.hits[0]);
                                                console.log("\n\n");
                                                console.log(JSON_response);
                                                res.send(JSON_response);
                                            }
                                            else {
                                                console.log("NO HITS:");
                                                console.log(data);
                                                console.log("\nTRYING IPAM METHOD");
                                                let response = await IPAM(MAC_addr, res, JSON_response);
                                                if(!response) {
                                                    console.log("Username not found");
                                                    res.status(500).send({error: 'No hits found'});
                                                }
                                            }
                                        })
                                        .catch(function (err) {
                                            console.error("REQUEST FAILED:");
                                            console.log(err);
                                            console.log("\n\n");
                                            res.status(500).send({ error: 'Something failed!' })
                                        });
                                }
                                else {
                                    console.log("NO HITS:");
                                    console.log(data);
                                    res.status(404).send({ error: 'No hits found' })
                                }
                            })
                            .catch(function (err) {
                                console.error("REQUEST FAILED:");
                                console.log(err);
                                console.log("\n\n");
                                res.status(500).send({ error: 'Something failed!' })
                            });
                    }
                    else {
                        console.log("NO HITS:");
                        console.log(data);
                        res.status(404).send({ error: 'No hits found' })
                    }
                })
                .catch(function (err) {
                    console.error("REQUEST FAILED:");
                    console.log(err);
                    console.log("\n\n");
                    res.status(500).send({ error: 'Something failed!' })
                });
        }
        
    }



    else if(recipe === "IP Default") {
        let dhcp_options = dhcp(timestamp, ip_address);

        rp(dhcp_options)
            .then(async function (data) {
                console.log("DHCP RESPONSE RECEIVED");
                if(data.hits.total > 0) {
                    JSON_response.DHCP = data.hits.hits[0];
                    console.log(data.hits.hits[0]);
                    console.log("\n\n");
                    let MAC_addr = data.hits.hits[0]._source.sourceMAC;
                    let MAC_addr2 = MAC_addr.replace(/:/g, "-");
                    let response = await ipam(MAC_addr, res, JSON_response);
                    if(!response) {
                        console.log("TRYING ISE METHOD");
                        let ise_options = ise(timestamp, MAC_addr2);
                        rp(ise_options)
                            .then(function (data) {
                                console.log("ISE ESPONSE RECEIVED:");
                                if(data.hits.total > 0) {
                                    JSON_response.ISE = data.hits.hits[0];
                                    JSON_response._source = {};
                                    JSON_response._source.username = data.hits.hits[0]._source.username;
                                    console.log(data.hits.hits[0]);
                                    console.log("\n\n");
                                    res.send(JSON_response);
                                }
                                else {
                                    console.log("NO HITS:");
                                    console.log(data);
                                    res.status(500).send({error: 'No hits found'});
                                }
                            })
                            .catch(function (err) {
                                console.error("REQUEST FAILED:");
                                console.log(err);
                                console.log("\n\n");
                                res.status(500).send({ error: 'Something failed!' });
                            });
                    }
                    //TRY ISE
                }
                else {
                    console.log("NO HITS:");
                    console.log(data);
                    res.status(404).send({ error: 'No hits found' })
                }
            })
            .catch(function (err) {
                console.error("REQUEST FAILED:");
                console.log(err);
                console.log("\n\n");
                res.status(500).send({ error: 'Something failed!' });
            });
    }


    else if(recipe === "error") {
        res.status(501).send("Could not find correct recipe");
    }
    else {
        res.status(500).send({ error: 'Something failed!' })
    }
});



/*********************************************************
                    Server Config
*********************************************************/

// Start Server
let server = https.createServer(certOptions, app).listen(PORT, function() {
    console.log('HTTPS server started on port ' + PORT + '...');
});

// Clean and Close Server
process.stdin.resume();//so the program will not close instantly

async function exitHandler(options, exitCode) {
    try { await BC_logout(); }
    catch (err) { console.log(err); }
    
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));





/*********************************************************
                   BlueCat Config
*********************************************************/


async function BC_logout() {
    return new Promise(function (resolve, reject) {
        soap.createClientAsync(bluecat_config.wsdl).then((client) => {
            client.addHttpHeader("Cookie", cookie); 
            return client.logoutAsync(null);
        }).catch(function (err) {
            console.log("\nLogout failed");
            reject(err);
        }).then((response) => {
            console.log("\nSucessfully Logged out of BlueCat");
            resolve();
        })
    });
}

function BC_login() {
    soap.createClient(bluecat_config.wsdl, function(err, client) {
        client.login({username: bluecat_config.user, password: bluecat_config.password}, function (err, response) {
            if (err) {
                console.log("BlueCat Login Failed: \n", err.root);
            } else {
                console.log("Successfully Logged Into Bluecat\n");
                cookie = client.lastResponseHeaders["set-cookie"][0];
            }
        });
    });
}





/*********************************************************
                    Helper Functions
*********************************************************/

function recipeTable(ip_arr) {
    if(ip_arr[0] !== 130)                                           return "error";
    else if(ip_arr[1] != 64)                                        return "error";
    else if(ip_arr[2] === 2 || ip_arr[2] === 3 || 
            ip_arr[2] === 6 || ip_arr[2] === 7 || 
            ip_arr[2] === 40 || ip_arr[2] === 41 || 
            ip_arr[2] === 14 || ip_arr[2] === 15)                   return "VPN";
    else if(ip_arr[2] === 4 && ip_arr[3] >= 48 && ip_arr[3] <= 55)  return "Wireless Secure";
    else if(ip_arr[2] === 25 && ip_arr[3] >= 56 && ip_arr[3] <= 63) return "Wireless Secure";
    else                                                            return "IP Default";
}

function ValidateIPaddress(ipaddress) {  
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
        return (true)  
    }  
    return (false)  
}  

function ValidateTimeStamp(timestamp) {
    if(/^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?$/.test(timestamp)){
        return (true)
    }
    return (false)
}

function parse_IPAM(log) {
    for(let i = 0; i < log.length; i++) {
        if(log[i].substring(0, 10) == "user_name=")
            return i;
    }
    return -1;
}






/****************************************************
                   Search Methods
****************************************************/

function vpn(timestamp, ip_address) {
    let topTime = new Date(new Date(timestamp) * 1 + 1000 * 3600 );
    let bottomTime = new Date(new Date(timestamp) * 1 - 1000 * 3600 );
    let post_data = 
    {
       "size": 1,
       "query" : {
            "bool" : {             
                "must" : [
                    {
                        "range": {"@timestamp": {"gte": bottomTime, "lte":topTime}}
                    },
                    {
                        "query_string": {
                            "query": "action:\"assigned to session\" AND type:vpn AND vpn_ip:\'" + ip_address + "\'",
                            "default_operator": "AND"
                        }
                    }
                ]
            }
        }
    };

    console.log("\nPOST DATA: ")
    console.log(post_data);
    console.log("\n");

    let options = {
        uri: big_bro_uri, 
        method: 'POST',
        body: post_data,
        json: true
    };

    return options;
}


function firewall(timestamp, ip_address, port) {
    let topTime = new Date(new Date(timestamp) * 1 + 1000 * 120 );
    //TODO: Modify offset value
    let bottomTime = new Date(new Date(timestamp) * 1 - 1000 * 120 );
    let post_data = 
    {
       "size": 1,
       "query" : {
            "bool" : {             
                "must" : [
                    {
                        "range": {"@timestamp": {"gte": bottomTime, "lte":topTime}}
                    },
                    {
                        "query_string": {
                            "query": "action:\"Built\" AND type:asa AND dst_mapped_ip:\'" + ip_address + "\' AND dst_mapped_port:\'" + port + "\'",
                            "default_operator": "AND"
                        }
                    }
                ]
            }
        }
    };

    console.log("\nPOST DATA: ")
    console.log(post_data);
    console.log("\n");

    let options = {
        uri: big_bro_uri, 
        method: 'POST',
        body: post_data,
        json: true
    };

    return options;
}




function dhcp(timestamp, dst_ip) {
    let topTime = new Date(new Date(timestamp) * 1 + 1000 * 3600 * 6);
    let bottomTime = new Date(new Date(timestamp) * 1 - 1000 * 3600 * 6);
    let post_data = 
    {
       "size": 1,
       "query" : {
            "bool" : {             
                "must" : [
                    {
                        "range": {"@timestamp": {"gte": bottomTime, "lte":topTime}}
                    },
                    {
                        "query_string": {
                            "query": "dhcptype:\"ACK\" AND type:dhcp AND sourceIP:\'" + dst_ip + "\'",
                            "default_operator": "AND"
                        }
                    }
                ]
            }
        }
    };

    console.log("\nPOST DATA: ")
    console.log(post_data);
    console.log("\n");

    let options = {
        uri: big_bro_uri, 
        method: 'POST',
        body: post_data,
        json: true
    };

    return options;
}



function ise(timestamp, mac_ip) {
    let topTime = new Date(new Date(timestamp) * 1 + 1000 * 3600 * 7 * 24);
    let bottomTime = new Date(new Date(timestamp) * 1 - 1000 * 3600 * 7 * 24);
    let post_data = 
    {
       "size": 1,
       "query" : {
            "bool" : {             
                "must" : [
                    {
                        "range": {"@timestamp": {"gte": bottomTime, "lte":topTime}}
                    },
                    {
                        "query_string": {
                            "query": "iselogtype:\"3000\" AND type:ise AND clientMAC:\'" + mac_ip + "\'",
                            "default_operator": "AND"
                        }
                    }
                ]
            }
        }
    };

    console.log("\nPOST DATA: ")
    console.log(post_data);
    console.log("\n");

    let options = {
        uri: big_bro_uri, 
        method: 'POST',
        body: post_data,
        json: true
    };

    return options;
}


//Uses SOAP API
async function ipam(mac_ip, res, JSON_response) {
    let requestArgs = {
        configurationId: bluecat_config.id,
        macAddress: mac_ip
    };

    return new Promise(function (resolve, reject) {
        soap.createClientAsync(bluecat_config.wsdl).then((client) => {
            client.addHttpHeader("Cookie", cookie); 
            return client.getMACAddressAsync(requestArgs);
        }).catch(function (err) {
            console.error("REQUEST FAILED:");
            console.log(err.root);
            console.log("\n\n");
            resolve(false);
        }).then((response) => {
            try {
                let log = response[0].return.properties.split("|");
                console.log(response);
                console.log("IPAM RESPONSE RECEIVED:");
                console.log(log);
                let index = parse_IPAM(log);
                if(index >= 0) {
                    response._source = {};
                    response._source.username = log[index].substring(10);
                    JSON_response.IPAM = response;
                    JSON_response._source = response._source;
                    res.send(JSON_response);
                    resolve(true);
                } 
                else {
                    console.log("Username not found in IPAM log\n");
                    resolve(false);
                }
            }
            catch(err) {
                resolve(false);
            }

        });

    });
    
    // Synchronous SOAP Request
    // soap.createClientAsync(bluecat_config.wsdl,  function(err, client) {
    //     client.addHttpHeader("Cookie", cookie);   
    //     client.getMACAddress(requestArgs, function (err, response) {
    //         if (err) {
    //             console.log("IPAM Request Failed: \n", err.root);
    //             console.log(requestArgs);
    //             res.status(500).send({ error: 'IPAM Request Failed' });
    //             return true;    
    //         }
    //         else {
    //             let log = response.return.properties.split("|");
    //             console.log("IPAM RESPONSE RECEIVED:");
    //             console.log(log);
    //             let index = parse_IPAM(log);
    //             if(index >= 0) {
    //                 response._source = {};
    //                 response._source.username = log[index].substring(10);
    //                 JSON_response.IPAM = response;
    //                 JSON_response._source = response._source;
    //                 res.send(JSON_response);
    //                 return true;
    //             } 
    //             else {
    //                 console.log("Username not found in IPAM log\n");
    //                 return false;
    //             }
    //         } 
    //     });  
    // });
}

